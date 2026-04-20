import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  inet,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid().notNull(),
    userId: varchar({ length: 255 }).notNull(),
    action: varchar({ length: 20 }).notNull().$type<'CREATE' | 'UPDATE' | 'DELETE'>(),
    entityType: varchar({ length: 30 })
      .notNull()
      .$type<
        | 'person'
        | 'relationship'
        | 'event'
        | 'family_tree'
        | 'tree_collaborator'
        | 'tenant_member'
      >(),

    entityId: uuid().notNull(),
    // oldData: jsonb().$type<Record<string, unknown> | null>(),
    // newData: jsonb().$type<Record<string, unknown> | null>(),
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
