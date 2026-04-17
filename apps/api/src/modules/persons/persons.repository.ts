import { Injectable, Inject } from '@nestjs/common'
import { and, asc, desc, eq, like, isNull, or, sql, type SQL } from 'drizzle-orm'
import { DATABASE } from '@/db/database.module'
import type {
  DatabaseClient,
  DatabaseTx,
  TransactionCallback,
} from '@/db/database.module'
import { persons } from '@/db/schema'
import type { CreatePersonDto } from './dto/create-person.dto'
import type { UpdatePersonDto } from './dto/update-person.dto'

export interface PersonFilters {
  tenantId: string
  search?: string
  isAlive?: boolean
}

export type PersonOrderByField = 'firstName' | 'lastName'

export interface PersonQueryOptions {
  limit: number
  offset: number
  orderByField: PersonOrderByField
  orderByDir: 'asc' | 'desc'
}

@Injectable()
export class PersonsRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  async findMany(filters: PersonFilters, options: PersonQueryOptions) {
    const orderBy =
      options.orderByDir === 'asc'
        ? asc(persons[options.orderByField])
        : desc(persons[options.orderByField])

    return this.db.query.persons.findMany({
      where: this.buildWhere(filters),
      limit: options.limit,
      offset: options.offset,
      orderBy,
    })
  }

  async count(filters: PersonFilters) {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(persons)
      .where(this.buildWhere(filters))

    return result[0]?.count ?? 0
  }

  async findById(tenantId: string, personId: string) {
    return this.db.query.persons.findFirst({
      where: this.buildWhere({ tenantId }, eq(persons.id, personId)),
    })
  }

  async findByLinkedUserId(userId: string, tenantId: string) {
    return this.db.query.persons.findFirst({
      where: this.buildWhere({ tenantId }, eq(persons.linkedUserId, userId)),
    })
  }

  async create(
    data: CreatePersonDto & {
      tenantId: string
      createdBy: string
      updatedBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [person] = await client
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
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [person] = await client
      .update(persons)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(this.buildWhere({ tenantId }, eq(persons.id, id)))
      .returning()
    return person
  }

  async softDelete(
    tenantId: string,
    personId: string,
    deletedBy: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [person] = await client
      .update(persons)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(this.buildWhere({ tenantId }, eq(persons.id, personId)))
      .returning()
    return person
  }

  private getClient(tx?: DatabaseTx) {
    return tx ?? this.db
  }

  private buildWhere(
    filters: Pick<PersonFilters, 'tenantId'>,
    ...extraConditions: SQL[]
  ) {
    return and(...this.buildConditions(filters), ...extraConditions)
  }

  private buildConditions(filters: PersonFilters | Pick<PersonFilters, 'tenantId'>) {
    const conditions: SQL[] = this.buildScopeConditions(filters.tenantId)

    if ('search' in filters && filters.search) {
      conditions.push(
        or(
          like(persons.firstName, `%${filters.search}%`),
          like(persons.lastName, `%${filters.search}%`),
          like(persons.nickname, `%${filters.search}%`),
        )!,
      )
    }

    if ('isAlive' in filters && filters.isAlive !== undefined) {
      conditions.push(eq(persons.isAlive, filters.isAlive))
    }

    return conditions
  }

  private buildScopeConditions(tenantId: string): SQL[] {
    return [eq(persons.tenantId, tenantId), isNull(persons.deletedAt)]
  }
}
