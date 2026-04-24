import { Injectable, Inject } from '@nestjs/common'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { users, tenants, tenantMembers, tenantInvitations } from '@/db/schema'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient } from '@/db/database.module'
import type { DatabaseTx, TransactionCallback } from '@/db/database.module'

@Injectable()
export class AuthRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  async findUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)
    return user ?? null
  }

  async findUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1)
    return user ?? null
  }

  async insertUser(
    data: {
      email: string
      password: string
      fullName: string
      createdBy: string | null
    },
    tx?: DatabaseTx,
  ) {
    const client = tx ?? this.db
    const [user] = await client.insert(users).values(data).returning()
    return user
  }

  async updateUserCreatedBy(userId: string, createdBy: string, tx?: DatabaseTx) {
    const client = tx ?? this.db
    await client.update(users).set({ createdBy }).where(eq(users.id, userId))
  }

  async updateUserLastLogin(userId: string) {
    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(users.id, userId))
  }

  // ─── Tenant queries ───────────────────────────────────────────────────────

  async findTenantBySlug(slug: string) {
    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1)
    return tenant ?? null
  }

  async insertTenant(
    data: {
      name: string
      slug: string
      createdBy: string | null
    },
    tx?: DatabaseTx,
  ) {
    const client = tx ?? this.db
    const [tenant] = await client.insert(tenants).values(data).returning()
    return tenant
  }

  async updateTenantCreatedBy(tenantId: string, createdBy: string, tx?: DatabaseTx) {
    const client = tx ?? this.db
    await client.update(tenants).set({ createdBy }).where(eq(tenants.id, tenantId))
  }

  // ─── Tenant member queries ────────────────────────────────────────────────

  async insertTenantMember(
    data: {
      tenantId: string
      userId: string
      role: 'owner' | 'admin' | 'member'
      status: string
      joinedAt: Date
      createdBy: string
      invitedBy?: string
    },
    tx?: DatabaseTx,
  ) {
    const client = tx ?? this.db
    const [member] = await client.insert(tenantMembers).values(data).returning()
    return member
  }

  async findUserMemberships(userId: string) {
    return this.db
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt),
          eq(tenantMembers.status, 'active'),
          isNull(tenants.deletedAt),
        ),
      )
  }

  async findMembership(userId: string, tenantId: string) {
    const [membership] = await this.db
      .select({
        role: tenantMembers.role,
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId),
          isNull(tenantMembers.deletedAt),
          eq(tenantMembers.status, 'active'),
        ),
      )
      .limit(1)
    return membership ?? null
  }

  async isAlreadyMember(userId: string, tenantId: string): Promise<boolean> {
    const [member] = await this.db
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .limit(1)
    return !!member
  }

  // ─── Invitation queries ───────────────────────────────────────────────────

  /**
   * Cari invitation berdasarkan kode (sudah di-normalize, tanpa dash).
   * Hanya return invitation yang masih aktif dan belum expired.
   */
  async findActiveInvitation(normalizedCode: string) {
    const [invitation] = await this.db
      .select({
        id: tenantInvitations.id,
        tenantId: tenantInvitations.tenantId,
        code: tenantInvitations.code,
        role: tenantInvitations.role,
        label: tenantInvitations.label,
        expiresAt: tenantInvitations.expiresAt,
        maxUses: tenantInvitations.maxUses,
        usedCount: tenantInvitations.usedCount,
        isActive: tenantInvitations.isActive,
      })
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.code, normalizedCode),
          eq(tenantInvitations.isActive, true),
        ),
      )
      .limit(1)
    return invitation ?? null
  }

  async incrementInvitationUsedCount(invitationId: string, tx?: DatabaseTx) {
    const client = tx ?? this.db
    await client
      .update(tenantInvitations)
      .set({
        usedCount: sql`${tenantInvitations.usedCount} + 1`,
      })
      .where(eq(tenantInvitations.id, invitationId))
  }

  async findTenantById(tenantId: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1)
    return tenant ?? null
  }
}
