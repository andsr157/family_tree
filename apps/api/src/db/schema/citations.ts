import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { tenants } from './tenants'
import { sources, confidenceLevelEnum } from './sources'

// Citations intentionally does NOT use metadataFields —
// no updatedAt/updatedBy because citations are immutable after creation.
// To "change" a citation, delete and recreate.
export const citations = pgTable(
  'citations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),

    // Polymorphic target
    entityType: varchar('entity_type', { length: 20 }).notNull(),
    entityId: uuid('entity_id').notNull(),

    // Citation-specific details
    detail: varchar('detail', { length: 500 }),
    pageReference: varchar('page_reference', { length: 200 }),

    // Evidence quality (can differ from parent source confidence)
    confidence: confidenceLevelEnum('confidence').notNull().default('probable'),

    // Audit — no updatedAt/updatedBy (immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
  },
  (table) => [
    index('idx_citations_source').on(table.sourceId),
    index('idx_citations_entity').on(table.entityType, table.entityId),
    index('idx_citations_tenant').on(table.tenantId),
    // Prevent duplicate: one source cannot be cited twice to the same entity
    uniqueIndex('idx_citations_unique')
      .on(table.sourceId, table.entityType, table.entityId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      'citations_entity_type_check',
      sql`${table.entityType} IN ('person', 'event', 'relationship')`,
    ),
  ],
)

export const citationsRelations = relations(citations, ({ one }) => ({
  source: one(sources, {
    fields: [citations.sourceId],
    references: [sources.id],
  }),
}))

export type Citation = typeof citations.$inferSelect
export type InsertCitation = typeof citations.$inferInsert
