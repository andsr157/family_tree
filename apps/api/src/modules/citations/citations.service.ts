import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { CitationsRepository } from './citations.repository'
import { SourcesRepository } from '@/modules/sources/sources.repository'
import { PersonsRepository } from '@/modules/persons/persons.repository'
import { EventsRepository } from '@/modules/events/event.repository'
import { RelationshipsRepository } from '@/modules/relationships/relationships.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateCitationDto } from './dto/create-citation.dto'
import type { UpdateCitationDto } from './dto/update-citation.dto'
import type { EntityType } from './dto/create-citation.dto'

@Injectable()
export class CitationsService {
  constructor(
    private citationsRepo: CitationsRepository,
    private sourcesRepo: SourcesRepository,
    private personsRepo: PersonsRepository,
    private eventsRepo: EventsRepository,
    private relationshipsRepo: RelationshipsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findBySource(sourceId: string, ctx: ServiceContext) {
    // Verify source belongs to this tenant
    const source = await this.sourcesRepo.assertExists(ctx.tenantId, sourceId)
    if (!source) throw new NotFoundException('Source not found')

    return this.citationsRepo.findBySource(sourceId, ctx.tenantId)
  }

  async findByEntity(entityType: EntityType, entityId: string, ctx: ServiceContext) {
    // Verify entity exists in this tenant
    await this.assertEntityExists(entityType, entityId, ctx.tenantId)

    return this.citationsRepo.findByEntity(entityType, entityId, ctx.tenantId)
  }

  async create(dto: CreateCitationDto, ctx: ServiceContext) {
    // 1. Validate source exists in this tenant
    const source = await this.sourcesRepo.assertExists(ctx.tenantId, dto.sourceId)
    if (!source) throw new NotFoundException('Source not found')

    // 2. Validate entity exists in this tenant
    await this.assertEntityExists(dto.entityType, dto.entityId, ctx.tenantId)

    // 3. Check for duplicate (graceful — DB unique index is the hard stop)
    const duplicate = await this.citationsRepo.findDuplicate(
      dto.sourceId,
      dto.entityType,
      dto.entityId,
    )
    if (duplicate) {
      throw new ConflictException(
        `A citation already exists linking this source to the specified ${dto.entityType}`,
      )
    }

    return this.citationsRepo.withTransaction(async (tx) => {
      const citation = await this.citationsRepo.create(
        {
          ...dto,
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
        },
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'citation',
          entityId: citation.id,
        },
        tx,
      )

      return citation
    })
  }

  async update(id: string, dto: UpdateCitationDto, ctx: ServiceContext) {
    const existing = await this.findCitationOrThrow(id, ctx.tenantId)

    if (!existing) {
      throw new NotFoundException('Citation not found')
    }

    return this.citationsRepo.withTransaction(async (tx) => {
      const updated = await this.citationsRepo.update(id, ctx.tenantId, dto, tx)

      if (!updated) {
        throw new NotFoundException('Citation not found or already deleted')
      }

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'citation',
          entityId: id,
        },
        tx,
      )

      return updated
    })
  }

  async softDelete(id: string, ctx: ServiceContext) {
    const existing = await this.findCitationOrThrow(id, ctx.tenantId)

    if (!existing) {
      throw new NotFoundException('Citation not found')
    }

    return this.citationsRepo.withTransaction(async (tx) => {
      const deleted = await this.citationsRepo.softDelete(
        id,
        ctx.tenantId,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'citation',
          entityId: id,
        },
        tx,
      )

      return deleted
    })
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findCitationOrThrow(id: string, tenantId: string) {
    const citation = await this.citationsRepo.findById(id, tenantId)
    if (!citation) throw new NotFoundException('Citation not found')
    return citation
  }

  private async assertEntityExists(
    entityType: EntityType,
    entityId: string,
    tenantId: string,
  ) {
    let exists: unknown

    switch (entityType) {
      case 'person':
        exists = await this.personsRepo.findById(tenantId, entityId)
        break
      case 'event':
        exists = await this.eventsRepo.findById(entityId, tenantId)
        break
      case 'relationship':
        exists = await this.relationshipsRepo.findById(entityId, tenantId)
        break
      default:
        throw new BadRequestException(`Unknown entity type: ${entityType}`)
    }

    if (!exists) {
      throw new NotFoundException(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`,
      )
    }
  }
}
