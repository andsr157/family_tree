import { Injectable, Inject } from '@nestjs/common'
import { DATABASE, type DatabaseClient, type DatabaseTx } from '@/db/database.module'
import { auditLogs } from '@/db/schema'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
type EntityType =
  | 'person'
  | 'relationship'
  | 'event'
  | 'family_tree'
  | 'tree_collaborator'
  | 'tenant_member'
  | 'citation'
  | 'sources'

@Injectable()
export class AuditLogsRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async create(
    data: {
      tenantId: string
      userId: string
      action: AuditAction
      entityType: EntityType
      entityId: string
      ipAddress?: string
    },
    tx?: DatabaseTx,
  ) {
    const client = tx ?? this.db
    const [log] = await client
      .insert(auditLogs)
      .values({
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
      })
      .returning()

    return log
  }
}
