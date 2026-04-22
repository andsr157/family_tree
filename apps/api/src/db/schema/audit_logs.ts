import { pgTable, uuid, varchar, inet, timestamp, index } from 'drizzle-orm/pg-core'
import type {
  AuditActionType,
  AuditEntityType,
} from '@/modules/audit-logs/audit-logs.type'

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid().notNull(),
    userId: uuid('user_id').notNull(),
    action: varchar({ length: 20 }).notNull().$type<AuditActionType>(),
    entityType: varchar({ length: 30 }).notNull().$type<AuditEntityType>(),
    entityId: uuid().notNull(),
    ipAddress: inet(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_tenant').on(table.tenantId),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_user').on(table.userId),
    index('idx_audit_created_at').on(table.createdAt),
  ],
)

export type AuditLog = typeof auditLogs.$inferSelect
export type InsertAuditLog = typeof auditLogs.$inferInsert
