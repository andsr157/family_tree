import { Inject } from '@nestjs/common'
import { and, isNull, eq, type SQL } from 'drizzle-orm'
import { DATABASE } from '@/db/database.module'
import type {
  DatabaseClient,
  DatabaseTx,
  TransactionCallback,
} from '@/db/database.module'

export abstract class BaseRepository {
  constructor(@Inject(DATABASE) protected readonly db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  protected getClient(tx?: DatabaseTx): DatabaseClient | DatabaseTx {
    return tx ?? this.db
  }

  protected buildScopedWhere(
    tenantIdColumn: Parameters<typeof eq>[0],
    tenantId: string,
    deletedAtColumn: Parameters<typeof isNull>[0],
    ...extra: (SQL | undefined)[]
  ) {
    return and(
      eq(tenantIdColumn, tenantId),
      isNull(deletedAtColumn),
      ...extra.filter((c): c is SQL => c !== undefined),
    )
  }
}
