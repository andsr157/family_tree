import { Injectable, Inject } from '@nestjs/common'
import { and, eq, ne, or, type SQL } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { relationships } from '@/db/schema'
import type { CreateRelationshipDto } from './dto/create-relationship.dto'
import type { UpdateRelationshipDto } from './dto/update-relationship.dto'

export interface RelationshipFilters {
  tenantId: string
  personId?: string
  type?: string
}

const relationshipPersonSummaryColumns = {
  id: true,
  firstName: true,
  lastName: true,
  nickname: true,
  gender: true,
  avatarUrl: true,
  isAlive: true,
} as const

@Injectable()
export class RelationshipsRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  async findManyByPerson(filters: RelationshipFilters) {
    return this.db.query.relationships.findMany({
      where: this.buildWhere(filters),
      with: {
        person1: {
          columns: relationshipPersonSummaryColumns,
        },
        person2: {
          columns: relationshipPersonSummaryColumns,
        },
      },
      orderBy: (rel, { asc }) => [asc(rel.createdAt)],
    })
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.relationships.findFirst({
      where: this.buildWhere({ tenantId }, eq(relationships.id, id)),
      with: {
        person1: true,
        person2: true,
      },
    })
  }

  async findExisting(
    person1Id: string,
    person2Id: string,
    type: string,
    tenantId: string,
    excludeId?: string,
  ) {
    const extraConditions = [this.buildPairMatchCondition(person1Id, person2Id)]

    if (excludeId) {
      extraConditions.push(ne(relationships.id, excludeId))
    }

    return this.db.query.relationships.findMany({
      where: this.buildWhere({ tenantId, type }, ...extraConditions),
    })
  }

  async findAncestors(
    personId: string,
    tenantId: string,
    visited = new Set<string>(),
    depth = 0,
    maxDepth = 20,
  ): Promise<Set<string>> {
    if (depth >= maxDepth || visited.has(personId)) {
      return visited
    }

    visited.add(personId)

    const parentRelationships = await this.db.query.relationships.findMany({
      where: this.buildWhere(
        { tenantId, type: 'parent-child' },
        eq(relationships.person2Id, personId),
      ),
      columns: {
        person1Id: true,
      },
    })

    for (const relationship of parentRelationships) {
      await this.findAncestors(
        relationship.person1Id,
        tenantId,
        visited,
        depth + 1,
        maxDepth,
      )
    }

    return visited
  }

  async create(
    data: CreateRelationshipDto & {
      tenantId: string
      createdBy: string
      updatedBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [relationship] = await client
      .insert(relationships)
      .values({ ...data, updatedAt: new Date() })
      .returning()
    return relationship
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRelationshipDto & { updatedBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [relationship] = await client
      .update(relationships)
      .set({ ...data, updatedAt: new Date() })
      .where(this.buildWhere({ tenantId }, eq(relationships.id, id)))
      .returning()
    return relationship
  }

  async softDelete(id: string, tenantId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [relationship] = await client
      .update(relationships)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(this.buildWhere({ tenantId }, eq(relationships.id, id)))
      .returning()

    return relationship
  }

  private buildWhere(
    filters: Pick<RelationshipFilters, 'tenantId'> | RelationshipFilters,
    ...extraConditions: SQL[]
  ) {
    return and(...this.buildConditions(filters), ...extraConditions)
  }

  private buildConditions(
    filters: Pick<RelationshipFilters, 'tenantId'> | RelationshipFilters,
  ) {
    const conditions: SQL[] = this.buildScopeConditions(
      relationships.tenantId,
      relationships.deletedAt,
      filters.tenantId,
    )

    if ('personId' in filters && filters.personId) {
      conditions.push(
        or(
          eq(relationships.person1Id, filters.personId),
          eq(relationships.person2Id, filters.personId),
        )!,
      )
    }

    if ('type' in filters && filters.type) {
      conditions.push(eq(relationships.type, filters.type))
    }

    return conditions
  }

  private buildPairMatchCondition(person1Id: string, person2Id: string): SQL {
    return or(
      and(eq(relationships.person1Id, person1Id), eq(relationships.person2Id, person2Id)),
      and(eq(relationships.person1Id, person2Id), eq(relationships.person2Id, person1Id)),
    )!
  }
}
