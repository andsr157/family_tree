import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PersonsRepository } from './persons.repository'
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreatePersonDto } from './dto/create-person.dto'
import type { UpdatePersonDto } from './dto/update-person.dto'
import type { QueryPersonDto } from './dto/query-person.dto'

@Injectable()
export class PersonsService {
  constructor(
    private personsRepo: PersonsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findAll(ctx: ServiceContext, query: QueryPersonDto) {
    const { q, page, pageSize, isAlive, sort } = query

    const offset = pageSize * (page - 1)

    const filters = {
      tenantId: ctx.tenantId,
      search: q,
      isAlive,
    }

    const sortMap: Record<
      string,
      { field: 'firstName' | 'createdAt'; dir: 'asc' | 'desc' }
    > = {
      firstName_asc: { field: 'firstName', dir: 'asc' },
      firstName_desc: { field: 'firstName', dir: 'desc' },
      createdAt_asc: { field: 'createdAt', dir: 'asc' },
      createdAt_desc: { field: 'createdAt', dir: 'desc' },
    }
    const orderBy = sortMap[sort] ?? sortMap['firstName_asc']

    const [items, totalItems] = await Promise.all([
      this.personsRepo.findMany(filters, {
        limit: pageSize,
        offset,
        orderByField: orderBy.field,
        orderByDir: orderBy.dir,
      }),
      this.personsRepo.count(filters),
    ])
    const totalPages = Math.ceil(totalItems / pageSize)

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    }
  }

  async findById(id: string, ctx: ServiceContext) {
    const person = await this.personsRepo.findById(id, ctx.tenantId)

    if (!person) {
      throw new NotFoundException('Person not found')
    }

    return person
  }

  async create(dto: CreatePersonDto, ctx: ServiceContext) {
    // Business rule: a deceased person cannot be claimable.
    if (dto.isAlive === false && dto.isClaimable === true) {
      throw new BadRequestException('A deceased person cannot be set as claimable')
    }

    const person = await this.personsRepo.create({
      ...dto,
      tenantId: ctx.tenantId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })

    await this.auditLogsRepo.create({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'person',
      entityId: person.id,
      oldData: null,
      newData: person,
    })

    return person
  }

  async update(id: string, dto: UpdatePersonDto, ctx: ServiceContext) {
    // Ensure the person exists.
    const existing = await this.personsRepo.findById(id, ctx.tenantId)
    if (!existing) {
      throw new NotFoundException('Person not found')
    }

    // Business rule: a deceased person cannot have a linked user.
    if (dto.isAlive === false && existing.linkedUserId) {
      throw new BadRequestException(
        'Unlink the user account before changing status to deceased',
      )
    }

    const willBeAlive = dto.isAlive ?? existing.isAlive
    const willBeClaimable = dto.isClaimable ?? existing.isClaimable
    if (willBeAlive === false && willBeClaimable === true) {
      throw new BadRequestException('A deceased person cannot be set as claimable')
    }

    const updated = await this.personsRepo.update(id, ctx.tenantId, {
      ...dto,
      updatedBy: ctx.userId,
    })

    if (!updated) {
      throw new NotFoundException('Person not found or already deleted')
    }

    await this.auditLogsRepo.create({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'person',
      entityId: id,
      oldData: existing,
      newData: updated,
    })

    return updated
  }

  async softDelete(id: string, ctx: ServiceContext) {
    const existing = await this.personsRepo.findById(id, ctx.tenantId)
    if (!existing) {
      throw new NotFoundException('Person not found')
    }

    // Business rule: cannot delete a person who still has a linked_user_id
    if (existing.linkedUserId) {
      throw new BadRequestException(
        'You cannot delete a person who is still linked to a user account. Please remove the link first.',
      )
    }

    const deleted = await this.personsRepo.softDelete(id, ctx.tenantId, ctx.userId)

    await this.auditLogsRepo.create({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'person',
      entityId: id,
      oldData: existing,
      newData: null,
    })

    return deleted
  }
}
