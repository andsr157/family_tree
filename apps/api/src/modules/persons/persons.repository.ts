import { Injectable, Inject } from '@nestjs/common'
import { DATABASE, type DatabaseClient } from '@/db/database.module'
import { persons } from '@/db/schema'
import { and, asc, desc, eq, like, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { CreatePersonDto } from './dto/create-person.dto'
import type { UpdatePersonDto } from './dto/update-person.dto'

export interface PersonFilters {
  tenantId: string
  search?: string
  isAlive?: boolean
}

export interface PersonQueryOptions {
  limit: number
  offset: number
  orderByField: 'firstName' | 'createdAt'
  orderByDir: 'asc' | 'desc'
}

@Injectable()
export class PersonsRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async findMany(filters: PersonFilters, options: PersonQueryOptions) {
    const conditions = this.buildConditions(filters)

    const orderByFn =
      options.orderByDir === 'asc'
        ? asc(persons[options.orderByField])
        : desc(persons[options.orderByField])

    return this.db.query.persons.findMany({
      where: and(...conditions),
      limit: options.limit,
      offset: options.offset,
      orderBy: orderByFn,
    })
  }

  async count(filters: PersonFilters) {
    const conditions = this.buildConditions(filters)

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(persons)
      .where(and(...conditions))

    return result[0]?.count ?? 0
  }

  async findById(tenantId: string, personId: string) {
    return this.db.query.persons.findFirst({
      where: and(
        eq(persons.id, personId),
        eq(persons.tenantId, tenantId),
        isNull(persons.deletedAt),
      ),
    })
  }

  async findByLinkedUserId(userId: string, tenantId: string) {
    return this.db.query.persons.findFirst({
      where: and(
        eq(persons.linkedUserId, userId),
        eq(persons.tenantId, tenantId),
        isNull(persons.deletedAt),
      ),
    })
  }

  async create(
    data: CreatePersonDto & {
      tenantId: string
      createdBy: string
      updatedBy: string
    },
  ) {
    const [person] = await this.db
      .insert(persons)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning()

    return person
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePersonDto & {
      updatedBy: string
    },
  ) {
    const [person] = await this.db
      .update(persons)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(persons.id, id),
          eq(persons.tenantId, tenantId),
          isNull(persons.deletedAt),
        ),
      )
      .returning()
    return person
  }

  async softDelete(tenantId: string, personId: string, deletedBy: string) {
    const [person] = await this.db
      .update(persons)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(
        and(
          eq(persons.id, personId),
          eq(persons.tenantId, tenantId),
          isNull(persons.deletedAt),
        ),
      )
      .returning()
    return person
  }

  private buildConditions(filters: PersonFilters) {
    const conditions: SQL[] = [
      eq(persons.tenantId, filters.tenantId),
      isNull(persons.deletedAt),
    ]

    if (filters.search) {
      conditions.push(
        or(
          like(persons.firstName, `%${filters.search}%`),
          like(persons.lastName, `%${filters.search}%`),
          like(persons.nickname, `%${filters.search}%`),
        )!,
      )
    }

    if (filters.isAlive !== undefined) {
      conditions.push(eq(persons.isAlive, filters.isAlive))
    }
    return conditions
  }
}
