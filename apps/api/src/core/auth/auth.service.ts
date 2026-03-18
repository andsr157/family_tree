import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { AuthRepository } from './repositories/auth.repository'
import { SessionRepository } from './repositories/session.repository'
import * as bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 12

@Injectable()
export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private sessionRepo: SessionRepository,
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
    const existingTenant = await this.authRepo.findTenantBySlug(data.slug)
    if (existingTenant) {
      throw new ConflictException('Slug is already taken')
    }

    const existingUser = await this.authRepo.findUserByEmail(data.email)
    if (existingUser) {
      throw new ConflictException('Email is already registered')
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    const result = await this.authRepo.withTransaction(async (tx) => {
      const tenant = await this.authRepo.insertTenant(
        { name: data.tenantName, slug: data.slug, createdBy: null },
        tx,
      )

      const user = await this.authRepo.insertUser(
        {
          email: data.email,
          password: passwordHash,
          fullName: data.fullName,
          createdBy: null,
        },
        tx,
      )

      await this.authRepo.updateTenantCreatedBy(tenant.id, user.id, tx)
      await this.authRepo.updateUserCreatedBy(user.id, user.id, tx)

      await this.authRepo.insertTenantMember(
        {
          tenantId: tenant.id,
          userId: user.id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
          createdBy: user.id,
        },
        tx,
      )

      return { user, tenant }
    })

    const sessionId = await this.sessionRepo.createSession(result.user.id, meta)
    return {
      sessionId,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      role: 'owner' as const,
    }
  }

  async login(
    data: { email: string; password: string },
    meta: { ip: string; userAgent: string },
  ) {
    const GENERIC_ERROR = 'Invalid email or password'

    const user = await this.authRepo.findUserByEmail(data.email)
    if (!user) throw new UnauthorizedException(GENERIC_ERROR)

    const isMatch = await bcrypt.compare(data.password, user.password)
    if (!isMatch) throw new UnauthorizedException(GENERIC_ERROR)

    const memberships = await this.authRepo.findUserMemberships(user.id)

    // Update last login
    await this.authRepo.updateUserLastLogin(user.id)

    const sessionId = await this.sessionRepo.createSession(user.id, meta)

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
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      tenants: tenantList,
      currentTenant:
        tenantList.length === 1
          ? { id: tenantList[0].id, name: tenantList[0].name }
          : null,
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessionRepo.deleteSession(sessionId, userId)
  }

  async getMe(userId: string, tenantId: string) {
    const user = await this.authRepo.findUserById(userId)
    if (!user) throw new UnauthorizedException()

    const membership = await this.authRepo.findMembership(userId, tenantId)
    if (!membership) throw new UnauthorizedException()

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isPlatformAdmin: user.isPlatformAdmin,
        defaultFocalPersonId: user.defaultFocalPersonId,
        preferredZoomLevel: user.preferredZoomLevel,
      },
      tenant: {
        id: membership.tenantId,
        name: membership.tenantName,
        slug: membership.tenantSlug,
      },
      role: membership.role,
    }
  }
}
