import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { EventsRepository } from './event.repository'
import { PersonsRepository } from '../persons/persons.repository'
import { RelationshipsRepository } from '../relationships/relationships.repository'
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'
import type { QueryEventDto } from './dto/query-event.dto'
import { UNIQUE_EVENT_TYPES, RELATIONSHIP_EVENT_TYPES } from './dto/create-event.dto'

@Injectable()
export class EventsService {
  constructor(
    private eventsRepo: EventsRepository,
    private personsRepo: PersonsRepository,
    private relationshipsRepo: RelationshipsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findAllByPerson(personId: string, ctx: ServiceContext, query: QueryEventDto) {
    await this.findPersonOrThrow(personId, ctx.tenantId)

    return this.eventsRepo.findManyByPerson({
      tenantId: ctx.tenantId,
      personId,
      type: query.type,
    })
  }

  async findById(id: string, ctx: ServiceContext) {
    return this.findEventOrThrow(id, ctx.tenantId)
  }

  async create(dto: CreateEventDto, ctx: ServiceContext) {
    // Verify person exists in this tenant
    await this.findPersonOrThrow(dto.personId, ctx.tenantId)

    // Enforce uniqueness for birth/death
    if (UNIQUE_EVENT_TYPES.includes(dto.type)) {
      const existing = await this.eventsRepo.findByPersonAndType(
        dto.personId,
        ctx.tenantId,
        dto.type,
      )
      if (existing) {
        throw new ConflictException(
          `A "${dto.type}" event already exists for this person. Only one "${dto.type}" event is allowed per person.`,
        )
      }
    }

    // Validate relationshipId if provided
    if (dto.relationshipId) {
      await this.validateRelationshipId(
        dto.relationshipId,
        dto.personId,
        dto.type,
        ctx.tenantId,
      )
    }

    return this.eventsRepo.withTransaction(async (tx) => {
      const event = await this.eventsRepo.create(
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
          entityType: 'event',
          entityId: event.id,
        },
        tx,
      )

      return event
    })
  }

  async update(id: string, dto: UpdateEventDto, ctx: ServiceContext) {
    const existing = await this.findEventOrThrow(id, ctx.tenantId)

    // Validate relationshipId against the existing event type (immutable)
    if (dto.relationshipId !== undefined) {
      if (
        dto.relationshipId &&
        !RELATIONSHIP_EVENT_TYPES.includes(
          existing.type as (typeof RELATIONSHIP_EVENT_TYPES)[number],
        )
      ) {
        throw new BadRequestException(
          `relationshipId is only applicable for event types: ${RELATIONSHIP_EVENT_TYPES.join(', ')}`,
        )
      }

      if (dto.relationshipId) {
        await this.validateRelationshipId(
          dto.relationshipId,
          existing.personId,
          existing.type as (typeof RELATIONSHIP_EVENT_TYPES)[number],
          ctx.tenantId,
        )
      }
    }

    return this.eventsRepo.withTransaction(async (tx) => {
      const updated = await this.eventsRepo.update(
        id,
        ctx.tenantId,
        { ...dto, updatedBy: ctx.userId },
        tx,
      )

      if (!updated) {
        throw new NotFoundException('Event not found or already deleted')
      }

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'event',
          entityId: id,
        },
        tx,
      )

      return updated
    })
  }

  async softDelete(id: string, ctx: ServiceContext) {
    const existing = await this.findEventOrThrow(id, ctx.tenantId)

    if (!existing) {
      throw new NotFoundException('Event not found')
    }

    return this.eventsRepo.withTransaction(async (tx) => {
      const deleted = await this.eventsRepo.softDelete(id, ctx.tenantId, ctx.userId, tx)

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'event',
          entityId: id,
        },
        tx,
      )

      return deleted
    })
  }

  private async findPersonOrThrow(personId: string, tenantId: string) {
    const person = await this.personsRepo.findById(tenantId, personId)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    return person
  }

  private async findEventOrThrow(
    id: string,
    tenantId: string,
    message = 'Event not found',
  ) {
    const event = await this.eventsRepo.findById(id, tenantId)
    if (!event) {
      throw new NotFoundException(message)
    }
    return event
  }

  private async validateRelationshipId(
    relationshipId: string,
    personId: string,
    eventType: (typeof RELATIONSHIP_EVENT_TYPES)[number],
    tenantId: string,
  ) {
    // Only marriage/divorce can have relationshipId
    if (!RELATIONSHIP_EVENT_TYPES.includes(eventType)) {
      throw new BadRequestException(
        `relationshipId is only applicable for event types: ${RELATIONSHIP_EVENT_TYPES.join(', ')}`,
      )
    }

    const relationship = await this.relationshipsRepo.findById(relationshipId, tenantId)

    if (!relationship) {
      throw new NotFoundException('Relationship not found')
    }

    // Must be a couple relationship
    if (relationship.type !== 'couple') {
      throw new BadRequestException(
        'relationshipId must refer to a "couple" type relationship',
      )
    }

    // The relationship must involve the person
    const involvesPerson =
      relationship.person1Id === personId || relationship.person2Id === personId

    if (!involvesPerson) {
      throw new BadRequestException(
        'The specified relationship does not involve this person',
      )
    }
  }
}
