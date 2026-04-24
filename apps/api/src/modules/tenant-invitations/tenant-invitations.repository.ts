import { Injectable, Inject } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { tenantInvitations } from '@/db/schema'
import type { CreateInvitationDto } from './dto/create-invitation'
import {
  generateInvitationCode,
  normalizeCode,
} from '@/common/utils/invitation-code.utils'

@Injectable()
export class TenantInvitationsRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  async findAllByTenant(tenantId: string) {
    return this.db.query.tenantInvitations.findMany({
      where: and(
        eq(tenantInvitations.tenantId, tenantId),
        eq(tenantInvitations.isActive, true),
      ),
      orderBy: (inv, { desc }) => [desc(inv.createdAt)],
    })
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.tenantInvitations.findFirst({
      where: and(eq(tenantInvitations.id, id), eq(tenantInvitations.tenantId, tenantId)),
    })
  }

  async findByCode(normalizedCode: string) {
    return this.db.query.tenantInvitations.findFirst({
      where: and(
        eq(tenantInvitations.code, normalizedCode),
        eq(tenantInvitations.isActive, true),
      ),
    })
  }

  async create(
    data: CreateInvitationDto & {
      tenantId: string
      createdBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)

    // Calculate expiresAt from expiresInHours
    let expiresAt: Date | null = null
    if (data.expiresInHours) {
      expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + data.expiresInHours)
    }

    // Generate unique code — retry if collision (very rare)
    let code: string
    let attempts = 0
    while (true) {
      attempts++
      if (attempts > 10) {
        throw new Error('Gagal generate kode unik setelah 10 percobaan')
      }

      const rawCode = generateInvitationCode()
      code = normalizeCode(rawCode)

      // Check collision in DB
      const existing = await this.db.query.tenantInvitations.findFirst({
        where: eq(tenantInvitations.code, code),
        columns: { id: true },
      })

      if (!existing) break // No collision, continue
    }

    const [invitation] = await client
      .insert(tenantInvitations)
      .values({
        tenantId: data.tenantId,
        code,
        role: data.role ?? 'member',
        label: data.label ?? null,
        expiresAt,
        maxUses: data.maxUses ?? null,
        usedCount: 0,
        isActive: true,
        createdBy: data.createdBy,
      })
      .returning()

    return invitation
  }

  async deactivate(id: string, tenantId: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [invitation] = await client
      .update(tenantInvitations)
      .set({ isActive: false })
      .where(and(eq(tenantInvitations.id, id), eq(tenantInvitations.tenantId, tenantId)))
      .returning()
    return invitation
  }

  async incrementUsedCount(id: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    await client
      .update(tenantInvitations)
      .set({
        usedCount: sql`${tenantInvitations.usedCount} + 1`,
      })
      .where(eq(tenantInvitations.id, id))
  }
}
