import { Injectable, Inject } from '@nestjs/common'
import { and, eq, type SQL } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { events } from '@/db/schema'
import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'

export interface EventFilters {
  tenantId: string
  personId?: string
  type?: string
}

@Injectable()
export class EventsRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  async findManyByPerson(filters: EventFilters) {
    return this.db.query.events.findMany({
      where: this.buildWhere(filters),
      orderBy: (e, { asc, desc }) => [desc(e.isPrimary), asc(e.date), asc(e.createdAt)],
    })
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.events.findFirst({
      where: this.buildWhere({ tenantId }, eq(events.id, id)),
    })
  }

  async findByPersonAndType(personId: string, tenantId: string, type: string) {
    return this.db.query.events.findFirst({
      where: this.buildWhere(
        { tenantId },
        eq(events.personId, personId),
        eq(events.type, type),
      ),
    })
  }

  async findByRelationshipId(relationshipId: string, tenantId: string) {
    return this.db.query.events.findMany({
      where: this.buildWhere({ tenantId }, eq(events.relationshipId, relationshipId)),
    })
  }

  async create(
    data: CreateEventDto & {
      tenantId: string
      createdBy: string
      updatedBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [event] = await client
      .insert(events)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning()
    return event
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateEventDto & { updatedBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [event] = await client
      .update(events)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(this.buildWhere({ tenantId }, eq(events.id, id)))
      .returning()
    return event
  }

  async softDelete(id: string, tenantId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [event] = await client
      .update(events)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(this.buildWhere({ tenantId }, eq(events.id, id)))
      .returning()
    return event
  }

  private buildWhere(
    filters: Pick<EventFilters, 'tenantId'> | EventFilters,
    ...extraConditions: SQL[]
  ) {
    return and(...this.buildConditions(filters), ...extraConditions)
  }

  private buildConditions(filters: Pick<EventFilters, 'tenantId'> | EventFilters) {
    const conditions: SQL[] = this.buildScopeConditions(
      events.tenantId,
      events.deletedAt,
      filters.tenantId,
    )

    if ('personId' in filters && filters.personId) {
      conditions.push(eq(events.personId, filters.personId))
    }

    if ('type' in filters && filters.type) {
      conditions.push(eq(events.type, filters.type))
    }

    return conditions
  }
}
