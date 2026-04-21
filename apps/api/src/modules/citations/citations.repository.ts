import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull, type SQL } from 'drizzle-orm'
import { citations } from '@/db/schema'
import { DATABASE } from '@/db/database.module'
import type {
  DatabaseClient,
  DatabaseTx,
  TransactionCallback,
} from '@/db/database.module'
import type { CreateCitationDto } from './dto/create-citation.dto'
import type { UpdateCitationDto } from './dto/update-citation.dto'

@Injectable()
export class CitationsRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  async findBySource(sourceId: string, tenantId: string) {
    return this.db.query.citations.findMany({
      where: this.buildWhere({ tenantId }, eq(citations.sourceId, sourceId)),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    })
  }

  async findByEntity(entityType: string, entityId: string, tenantId: string) {
    return this.db.query.citations.findMany({
      where: this.buildWhere(
        { tenantId },
        eq(citations.entityType, entityType),
        eq(citations.entityId, entityId),
      ),
      with: {
        source: {
          columns: {
            id: true,
            title: true,
            sourceType: true,
            confidence: true,
            url: true,
            repository: true,
          },
        },
      },
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    })
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.citations.findFirst({
      where: this.buildWhere({ tenantId }, eq(citations.id, id)),
      with: {
        source: true,
      },
    })
  }

  async findDuplicate(sourceId: string, entityType: string, entityId: string) {
    return this.db.query.citations.findFirst({
      where: and(
        eq(citations.sourceId, sourceId),
        eq(citations.entityType, entityType),
        eq(citations.entityId, entityId),
        isNull(citations.deletedAt),
      ),
      columns: { id: true },
    })
  }

  async create(
    data: CreateCitationDto & { tenantId: string; createdBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [citation] = await client.insert(citations).values(data).returning()
    return citation
  }

  async update(id: string, tenantId: string, data: UpdateCitationDto, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [citation] = await client
      .update(citations)
      .set(data)
      .where(this.buildWhere({ tenantId }, eq(citations.id, id)))
      .returning()
    return citation
  }

  async softDelete(id: string, tenantId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [citation] = await client
      .update(citations)
      .set({
        deletedAt: new Date(),
        deletedBy,
      })
      .where(this.buildWhere({ tenantId }, eq(citations.id, id)))
      .returning()
    return citation
  }

  private getClient(tx?: DatabaseTx) {
    return tx ?? this.db
  }

  private buildWhere(filters: { tenantId: string }, ...extra: SQL[]) {
    return and(
      eq(citations.tenantId, filters.tenantId),
      isNull(citations.deletedAt),
      ...extra,
    )
  }
}
