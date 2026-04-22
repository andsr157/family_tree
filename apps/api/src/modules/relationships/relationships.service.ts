import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { RelationshipsRepository } from './relationships.repository'
import { PersonsRepository } from '../persons/persons.repository'
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateRelationshipDto } from './dto/create-relationship.dto'
import type { UpdateRelationshipDto } from './dto/update-relationship.dto'
import type { QueryRelationshipDto } from './dto/query-relationship.dto'

const VALID_SUBTYPES: Record<string, string[]> = {
  couple: ['married', 'partnered', 'divorced', 'separated'],
  'parent-child': ['biological', 'adopted', 'step', 'foster'],
}

@Injectable()
export class RelationshipsService {
  constructor(
    private relationshipsRepo: RelationshipsRepository,
    private personsRepo: PersonsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findAllByPerson(
    personId: string,
    ctx: ServiceContext,
    query: QueryRelationshipDto,
  ) {
    await this.findPersonOrThrow(personId, ctx.tenantId, 'Person not found')

    return this.relationshipsRepo.findManyByPerson({
      tenantId: ctx.tenantId,
      personId,
      type: query.type,
    })
  }

  async findById(id: string, ctx: ServiceContext) {
    const relationship = await this.findRelationshipOrThrow(id, ctx.tenantId)

    return relationship
  }

  async create(dto: CreateRelationshipDto, ctx: ServiceContext) {
    await Promise.all([
      this.findPersonOrThrow(
        dto.person1Id,
        ctx.tenantId,
        'Person 1 not found in this tenant',
      ),
      this.findPersonOrThrow(
        dto.person2Id,
        ctx.tenantId,
        'Person 2 not found in this tenant',
      ),
    ])

    const existing = await this.relationshipsRepo.findExisting(
      dto.person1Id,
      dto.person2Id,
      dto.type,
      ctx.tenantId,
    )

    if (existing.length > 0) {
      throw new ConflictException(
        `Relationship ${dto.type} between these two persons already exists`,
      )
    }

    // Business rule: parent-child relationship must not create circular dependency.
    if (dto.type === 'parent-child') {
      await this.validateNoCircular(dto.person1Id, dto.person2Id, ctx.tenantId)
    }

    return this.relationshipsRepo.withTransaction(async (tx) => {
      const relationship = await this.relationshipsRepo.create(
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
          entityType: 'relationship',
          entityId: relationship.id,
        },
        tx,
      )

      return relationship
    })
  }

  async update(id: string, dto: UpdateRelationshipDto, ctx: ServiceContext) {
    const existing = await this.findRelationshipOrThrow(id, ctx.tenantId)

    if (dto.subtype) {
      const valid = VALID_SUBTYPES[existing.type]

      if (!valid?.includes(dto.subtype)) {
        throw new BadRequestException(
          `Subtype "${dto.subtype}" is not valid for type "${existing.type}". Must be: ${valid?.join(', ')}`,
        )
      }
    }

    // Business rule: end date cannot be before start date.
    const startDate = dto.startDate ?? existing.startDate
    const endDate = dto.endDate ?? existing.endDate
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('endDate cannot be before startDate')
    }

    return this.relationshipsRepo.withTransaction(async (tx) => {
      const updated = await this.relationshipsRepo.update(
        id,
        ctx.tenantId,
        { ...dto, updatedBy: ctx.userId },
        tx,
      )

      if (!updated) {
        throw new NotFoundException('Relationship not found or already deleted')
      }

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'relationship',
          entityId: id,
        },
        tx,
      )

      return updated
    })
  }

  async softDelete(id: string, ctx: ServiceContext) {
    await this.findRelationshipOrThrow(id, ctx.tenantId, 'Relationship not found')

    return this.relationshipsRepo.withTransaction(async (tx) => {
      const deleted = await this.relationshipsRepo.softDelete(
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
          entityType: 'relationship',
          entityId: id,
        },
        tx,
      )

      return deleted
    })
  }

  private async findPersonOrThrow(
    personId: string,
    tenantId: string,
    notFoundMessage = 'Person not found',
  ) {
    const person = await this.personsRepo.findById(tenantId, personId)

    if (!person) {
      throw new NotFoundException(notFoundMessage)
    }

    return person
  }

  private async findRelationshipOrThrow(
    id: string,
    tenantId: string,
    notFoundMessage = 'Relationship not found',
  ) {
    const relationship = await this.relationshipsRepo.findById(id, tenantId)

    if (!relationship) {
      throw new NotFoundException(notFoundMessage)
    }

    return relationship
  }

  private async validateNoCircular(parentId: string, childId: string, tenantId: string) {
    const ancestorsOfParent = await this.relationshipsRepo.findAncestors(
      parentId,
      tenantId,
    )

    if (ancestorsOfParent.has(childId)) {
      throw new BadRequestException(
        'Cannot create this relationship - it would form a circular dependency in the family tree',
      )
    }

    const ancestorsOfChild = await this.relationshipsRepo.findAncestors(childId, tenantId)

    if (ancestorsOfChild.has(parentId)) {
      throw new BadRequestException(
        'Cannot create this relationship - the first person is already a descendant of the second person',
      )
    }
  }
}
