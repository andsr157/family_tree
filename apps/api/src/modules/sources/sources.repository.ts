import { Injectable, Inject } from '@nestjs/common'
import { and, asc, desc, eq, ilike, isNull, sql, type SQL } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { citations, sources } from '@/db/schema'
import type {
  SourceType,
  ConfidenceLevel,
  CreateSourceDto,
} from './dto/create-source.dto'
import { SOURCE_TYPES } from './dto/create-source.dto'
import type { UpdateSourceDto } from './dto/update-source.dto'
import type { QuerySourceDto } from './dto/query-source.dto'

export interface SourceFilters {
  tenantId: string
  q?: string
  type?: SourceType
  confidence?: ConfidenceLevel
}

@Injectable()
export class SourcesRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  async findMany(filters: SourceFilters, query: QuerySourceDto) {
    const { page, pageSize, sort } = query
    const offset = pageSize * (page - 1)

    const orderBy = sort === 'title_asc' ? asc(sources.title) : desc(sources.createdAt)

    return this.db.query.sources.findMany({
      where: this.buildWhere(filters),
      limit: pageSize,
      offset,
      orderBy,
      with: {
        citations: {
          where: isNull(citations.deletedAt),
          columns: {
            id: true,
            entityType: true,
            entityId: true,
            detail: true,
            pageReference: true,
            confidence: true,
            createdAt: true,
          },
        },
      },
    })
  }

  async count(filters: SourceFilters) {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(sources)
      .where(this.buildWhere(filters))

    return result[0]?.count ?? 0
  }

  async findById(tenantId: string, id: string) {
    return this.db.query.sources.findFirst({
      where: this.buildWhere({ tenantId }, eq(sources.id, id)),
      with: {
        citations: {
          where: isNull(citations.deletedAt),
          columns: {
            id: true,
            entityType: true,
            entityId: true,
            detail: true,
            pageReference: true,
            confidence: true,
            createdAt: true,
            createdBy: true,
          },
        },
      },
    })
  }

  async assertExists(tenantId: string, id: string) {
    return this.db.query.sources.findFirst({
      where: this.buildWhere({ tenantId }, eq(sources.id, id)),
      columns: { id: true },
    })
  }

  async countCitations(sourceId: string, tenantId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(citations)
      .where(
        and(
          eq(citations.sourceId, sourceId),
          eq(citations.tenantId, tenantId),
          isNull(citations.deletedAt),
        ),
      )
    return result[0]?.count ?? 0
  }

  async create(
    data: CreateSourceDto & { tenantId: string; createdBy: string; updatedBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [source] = await client
      .insert(sources)
      .values({ ...data, updatedAt: new Date() })
      .returning()
    return source
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateSourceDto & { updatedBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [source] = await client
      .update(sources)
      .set({ ...data, updatedAt: new Date() })
      .where(this.buildWhere({ tenantId }, eq(sources.id, id)))
      .returning()
    return source
  }

  async softDelete(id: string, tenantId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [source] = await client
      .update(sources)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(this.buildWhere({ tenantId }, eq(sources.id, id)))
      .returning()
    return source
  }

  private buildWhere(
    filters: Pick<SourceFilters, 'tenantId'> | SourceFilters,
    ...extra: SQL[]
  ) {
    return and(...this.buildConditions(filters), ...extra)
  }

  private buildConditions(filters: Pick<SourceFilters, 'tenantId'> | SourceFilters) {
    const conditions: SQL[] = this.buildScopeConditions(
      sources.tenantId,
      sources.deletedAt,
      filters.tenantId,
    )

    if ('type' in filters && filters.type) {
      if (SOURCE_TYPES.includes(filters.type as SourceType)) {
        conditions.push(eq(sources.sourceType, filters.type as SourceType))
      }
    }

    if ('confidence' in filters && filters.confidence) {
      conditions.push(eq(sources.confidence, filters.confidence as ConfidenceLevel))
    }

    if ('q' in filters && filters.q) {
      conditions.push(ilike(sources.title, `%${filters.q}%`))
    }

    return conditions
  }
}
