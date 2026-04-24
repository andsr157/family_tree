import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
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

  // ─── Register tenant (legacy flow, still available) ──────────────────────

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

  /**
   * Register a new account WITHOUT creating a tenant.
   * After registration, user logs in and will be directed to:
   * - Create a new tenant, or
   * - Join a tenant via invitation code
   */
  async register(
    data: {
      fullName: string
      email: string
      password: string
    },
    meta: { ip: string; userAgent: string },
  ) {
    const existingUser = await this.authRepo.findUserByEmail(data.email)
    if (existingUser) {
      throw new ConflictException('Email is already registered')
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    const user = await this.authRepo.withTransaction(async (tx) => {
      const newUser = await this.authRepo.insertUser(
        {
          email: data.email,
          password: passwordHash,
          fullName: data.fullName,
          createdBy: null,
        },
        tx,
      )

      // Self-reference created_by
      await this.authRepo.updateUserCreatedBy(newUser.id, newUser.id, tx)

      return newUser
    })

    const sessionId = await this.sessionRepo.createSession(user.id, meta)

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      tenants: [],
      hasNoTenant: true,
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
      // Flag for frontend: should onboarding page be shown?
      hasNoTenant: tenantList.length === 0,
    }
  }

  // Create new tenant (after login, no tenant yet)

  /**
   * Called by a user who is already logged in but does not have a tenant yet.
   * Creates a new tenant and makes the user the owner.
   */
  async createTenant(data: { tenantName: string; slug: string }, userId: string) {
    const existingTenant = await this.authRepo.findTenantBySlug(data.slug)
    if (existingTenant) {
      throw new ConflictException('Slug is already taken, try another one')
    }

    return this.authRepo.withTransaction(async (tx) => {
      const tenant = await this.authRepo.insertTenant(
        { name: data.tenantName, slug: data.slug, createdBy: userId },
        tx,
      )

      await this.authRepo.insertTenantMember(
        {
          tenantId: tenant.id,
          userId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
          createdBy: userId,
        },
        tx,
      )

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        role: 'owner' as const,
      }
    })
  }

  // Join tenant via invitation code

  /**
   * Called by a user who is already logged in and wants to join
   * an existing tenant using an invitation code.
   *
   * Code received is already normalized by Zod schema (no dashes, uppercase).
   */
  async joinTenant(normalizedCode: string, userId: string) {
    // 1. Find invitation
    const invitation = await this.authRepo.findActiveInvitation(normalizedCode)

    if (!invitation) {
      throw new NotFoundException('Invitation code not found or not active')
    }

    // 2. Check expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation code has expired')
    }

    // 3. Check max uses
    if (invitation.maxUses !== null && invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('Invitation code has reached usage limit')
    }

    // 4. Check if user is already a member of this tenant
    const alreadyMember = await this.authRepo.isAlreadyMember(userId, invitation.tenantId)
    if (alreadyMember) {
      throw new ConflictException('You are already a member of this family')
    }

    // 5. Find tenant data
    const tenant = await this.authRepo.findTenantById(invitation.tenantId)
    if (!tenant) {
      throw new NotFoundException('Family not found')
    }

    // 6. Add user to tenant and increment used_count
    return this.authRepo.withTransaction(async (tx) => {
      await this.authRepo.insertTenantMember(
        {
          tenantId: invitation.tenantId,
          userId,
          role: invitation.role as 'admin' | 'member',
          status: 'active',
          joinedAt: new Date(),
          createdBy: userId,
          invitedBy: invitation.id, // reference to invitation
        },
        tx,
      )

      await this.authRepo.incrementInvitationUsedCount(invitation.id, tx)

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        role: invitation.role,
      }
    })
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessionRepo.deleteSession(sessionId, userId)
  }

  async validateInvitationCode(code: string) {
    const invitation = await this.authRepo.findActiveInvitation(code)
    if (!invitation) {
      throw new NotFoundException('Invitation code not found or not active')
    }
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation code has expired')
    }
    const tenant = await this.authRepo.findTenantById(invitation.tenantId)
    return {
      valid: true,
      tenantName: tenant?.name ?? null,
      role: invitation.role,
    }
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
