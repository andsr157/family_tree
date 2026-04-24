import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { tenantMembers } from '@/db/schema'

@Injectable()
export class TenantMembersRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  // ─── List all members in tenant ─────────────────────────────────────────

  async findAllByTenant(tenantId: string) {
    return this.db.query.tenantMembers.findMany({
      where: and(
        eq(tenantMembers.tenantId, tenantId),
        isNull(tenantMembers.deletedAt),
        ne(tenantMembers.status, 'left'),
      ),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: (tm, { asc, desc }) => [
        // Owner first, then admin, then member
        desc(tm.role),
        asc(tm.joinedAt),
      ],
    })
  }

  // ─── Find one member ──────────────────────────────────────────────────────

  async findOne(tenantId: string, userId: string) {
    return this.db.query.tenantMembers.findFirst({
      where: and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId),
        isNull(tenantMembers.deletedAt),
      ),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  // ─── Count active owners in tenant ───────────────────────────────────────

  async countOwners(tenantId: string): Promise<number> {
    const result = await this.db.query.tenantMembers.findMany({
      where: and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.role, 'owner'),
        eq(tenantMembers.status, 'active'),
        isNull(tenantMembers.deletedAt),
      ),
      columns: { id: true },
    })
    return result.length
  }

  // ─── Update role ─────────────────────────────────────────────────────────

  async updateRole(
    tenantId: string,
    userId: string,
    role: 'admin' | 'member',
    updatedBy: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [member] = await client
      .update(tenantMembers)
      .set({ role, updatedBy, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .returning()
    return member
  }

  // ─── Update status (active/suspended) ────────────────────────────────────

  async updateStatus(
    tenantId: string,
    userId: string,
    status: 'active' | 'suspended',
    updatedBy: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [member] = await client
      .update(tenantMembers)
      .set({ status, updatedBy, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .returning()
    return member
  }

  // ─── Remove member (soft delete — status becomes 'left') ─────────────────

  async removeMember(
    tenantId: string,
    userId: string,
    removedBy: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [member] = await client
      .update(tenantMembers)
      .set({
        status: 'left',
        deletedAt: new Date(),
        deletedBy: removedBy,
        updatedAt: new Date(),
        updatedBy: removedBy,
      })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .returning()
    return member
  }

  // ─── Transfer ownership ───────────────────────────────────────────────────

  async transferOwnership(
    tenantId: string,
    fromUserId: string,
    toUserId: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)

    // Downgrade current owner to admin
    await client
      .update(tenantMembers)
      .set({ role: 'admin', updatedBy: fromUserId, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, fromUserId),
          isNull(tenantMembers.deletedAt),
        ),
      )

    // Upgrade target user to owner
    const [newOwner] = await client
      .update(tenantMembers)
      .set({ role: 'owner', updatedBy: fromUserId, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, toUserId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .returning()

    return newOwner
  }
}
