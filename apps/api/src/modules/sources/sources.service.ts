import { Injectable, NotFoundException } from '@nestjs/common'
import { SourcesRepository } from './sources.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateSourceDto } from './dto/create-source.dto'
import type { UpdateSourceDto } from './dto/update-source.dto'
import type { QuerySourceDto } from './dto/query-source.dto'

@Injectable()
export class SourcesService {
  constructor(
    private sourcesRepo: SourcesRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findAll(ctx: ServiceContext, query: QuerySourceDto) {
    const filters = {
      tenantId: ctx.tenantId,
      q: query.q,
      type: query.type,
      confidence: query.confidence,
    }

    const [items, totalItems] = await Promise.all([
      this.sourcesRepo.findMany(filters, query),
      this.sourcesRepo.count(filters),
    ])

    const totalPages = Math.ceil(totalItems / query.pageSize)

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    }
  }

  async findById(id: string, ctx: ServiceContext) {
    return this.findSourceOrThrow(id, ctx.tenantId)
  }

  async create(dto: CreateSourceDto, ctx: ServiceContext) {
    return this.sourcesRepo.withTransaction(async (tx) => {
      const source = await this.sourcesRepo.create(
        {
          ...dto,
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        },
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'sources',
          entityId: source.id,
        },
        tx,
      )

      return source
    })
  }

  async update(id: string, dto: UpdateSourceDto, ctx: ServiceContext) {
    const existing = await this.findSourceOrThrow(id, ctx.tenantId)

    // Tier 1: owner of the source can always edit
    // Tier 1: admin/owner role can always edit
    // Tier 2: member editing someone else's source — for now direct save,
    //         change_requests module can be layered on top later
    const isOwnerOfSource = existing.createdBy === ctx.userId
    const isAdminOrOwner = ctx.userRole === 'admin' || ctx.userRole === 'owner'

    if (!isOwnerOfSource && !isAdminOrOwner) {
      // Future: route to change_requests queue (T2 — 72h auto-approve)
      // For now: allow but flag in audit log
    }

    return this.sourcesRepo.withTransaction(async (tx) => {
      const updated = await this.sourcesRepo.update(
        id,
        ctx.tenantId,
        { ...dto, updatedBy: ctx.userId },
        tx,
      )

      if (!updated) {
        throw new NotFoundException('Source not found or already deleted')
      }

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'sources',
          entityId: id,
        },
        tx,
      )

      return updated
    })
  }

  async softDelete(id: string, ctx: ServiceContext) {
    const existing = await this.findSourceOrThrow(id, ctx.tenantId)

    if (!existing) {
      throw new NotFoundException('Source not found')
    }
    // Tier 3: only admin/owner can delete
    // Count active citations so admin can assess impact
    const citationCount = await this.sourcesRepo.countCitations(id, ctx.tenantId)

    return this.sourcesRepo.withTransaction(async (tx) => {
      const deleted = await this.sourcesRepo.softDelete(id, ctx.tenantId, ctx.userId, tx)

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'sources',
          entityId: id,
        },
        tx,
      )

      return { ...deleted, cascadedCitationsCount: citationCount }
    })
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findSourceOrThrow(id: string, tenantId: string) {
    const source = await this.sourcesRepo.findById(tenantId, id)
    if (!source) {
      throw new NotFoundException('Source not found')
    }
    return source
  }

  // Exclude notes from audit log to reduce risk of sensitive data in audit trail
  private toAuditPayload(source: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { notes: _notes, ...rest } = source as Record<string, unknown>
    return rest
  }
}
