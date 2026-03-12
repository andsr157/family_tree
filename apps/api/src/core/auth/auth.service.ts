import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, isNull } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { DATABASE } from '../../db/database.module'
import { users, tenants, tenantMembers } from '../../db/schema'
import { RedisService } from '../redis/redis.service'
import type { SessionData } from './auth.types'

const BCRYPT_ROUNDS = 12
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private db: NodePgDatabase,
    private redis: RedisService,
  ) {}

  async registerTenant(
    data: {
      tenantName: string
      slug: string
      fullName: string
      email: string
      password: string
    },
    meta: { ip: string; userAgent: string },
  ) {
    const [existingTenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, data.slug), isNull(tenants.deleted_at)))
      .limit(1)

    if (existingTenant) {
      throw new ConflictException('Slug is already taken')
    }

    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), isNull(users.deleted_at)))
      .limit(1)

    if (existingUser) {
      throw new ConflictException('Email is already registered')
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    const result = await this.db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: data.tenantName,
          slug: data.slug,
          created_by: null,
        })
        .returning()

      const [user] = await tx
        .insert(users)
        .values({
          email: data.email,
          password: passwordHash,
          full_name: data.fullName,
          created_by: null,
        })
        .returning()

      await tx.update(tenants).set({ created_by: user.id }).where(eq(tenants.id, tenant.id))
      await tx.update(users).set({ created_by: user.id }).where(eq(users.id, user.id))

      await tx.insert(tenantMembers).values({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date(),
        created_by: user.id,
      })

      return { user, tenant }
    })

    const sessionId = await this.createSession(result.user.id, meta)

    return {
      sessionId,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      role: 'owner' as const,
    }
  }

  async login(data: { email: string; password: string }, meta: { ip: string; userAgent: string }) {
    const GENERIC_ERROR = 'Invalid email or password'

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, data.email), isNull(users.deleted_at)))
      .limit(1)

    if (!user) {
      throw new UnauthorizedException(GENERIC_ERROR)
    }

    const isMatch = await bcrypt.compare(data.password, user.password)
    if (!isMatch) {
      throw new UnauthorizedException(GENERIC_ERROR)
    }

    const memberships = await this.db
      .select({
        tenantId: tenantMembers.tenant_id,
        role: tenantMembers.role,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenant_id, tenants.id))
      .where(
        and(
          eq(tenantMembers.user_id, user.id),
          isNull(tenantMembers.deleted_at),
          eq(tenantMembers.status, 'active'),
          isNull(tenants.deleted_at),
        ),
      )

    // Update last login
    await this.db
      .update(users)
      .set({
        last_login_at: new Date(),
        updated_at: new Date(),
        updated_by: user.id,
      })
      .where(eq(users.id, user.id))

    const sessionId = await this.createSession(user.id, meta)

    const tenantList = memberships.map((m) => ({
      id: m.tenantId,
      name: m.tenantName,
      slug: m.tenantSlug,
      role: m.role,
    }))

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isPlatformAdmin: user.is_platform_admin,
      },
      tenants: tenantList,
      currentTenant:
        tenantList.length === 1 ? { id: tenantList[0].id, name: tenantList[0].name } : null,
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.redis.deleteSession(sessionId)
    await this.redis.removeUserSession(userId, sessionId)
  }

  async getMe(userId: string, tenantId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deleted_at)))
      .limit(1)

    if (!user) throw new UnauthorizedException()

    const [membership] = await this.db
      .select({
        role: tenantMembers.role,
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenant_id, tenants.id))
      .where(
        and(
          eq(tenantMembers.user_id, userId),
          eq(tenantMembers.tenant_id, tenantId),
          isNull(tenantMembers.deleted_at),
          eq(tenantMembers.status, 'active'),
        ),
      )
      .limit(1)

    if (!membership) throw new UnauthorizedException()

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isPlatformAdmin: user.is_platform_admin,
        defaultFocalPersonId: user.default_focal_person_id,
        preferredZoomLevel: user.preferred_zoom_level,
      },
      tenant: {
        id: membership.tenantId,
        name: membership.tenantName,
        slug: membership.tenantSlug,
      },
      role: membership.role,
    }
  }

  private async createSession(
    userId: string,
    meta: { ip: string; userAgent: string },
  ): Promise<string> {
    const sessionId = randomBytes(32).toString('hex')

    const sessionData: SessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      deviceInfo: {
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    }

    await this.redis.setSession(sessionId, sessionData, SESSION_TTL)
    await this.redis.addUserSession(userId, sessionId)

    return sessionId
  }
}
