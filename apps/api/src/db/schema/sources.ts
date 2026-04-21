import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  smallint,
  date,
  text,
  index,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { tenants } from './tenants'
import { citations } from './citations'
import { metadataFields } from './helpers'

export const sourceTypeEnum = pgEnum('source_type', [
  'vital_record',
  'census',
  'photograph',
  'oral_history',
  'book',
  'newspaper',
  'religious',
  'military',
  'legal',
  'website',
  'other',
])

export const confidenceLevelEnum = pgEnum('confidence_level', [
  'confirmed',
  'probable',
  'possible',
  'disputed',
])

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Required fields
    title: varchar('title', { length: 500 }).notNull(),
    sourceType: sourceTypeEnum('source_type').notNull(),

    // Bibliographic metadata (optional)
    author: varchar('author', { length: 300 }),
    publisher: varchar('publisher', { length: 300 }),
    publicationYear: smallint('publication_year'),

    // external URL
    url: varchar('url', { length: 2048 }),
    urlAccessedAt: date('url_accessed_at'),

    // physical repository reference
    repository: varchar('repository', { length: 500 }),
    callNumber: varchar('call_number', { length: 200 }),
    pageNumber: varchar('page_number', { length: 100 }),

    // Free text notes (no NIK, no sensitive identifiers)
    notes: text('notes'),

    confidence: confidenceLevelEnum('confidence').notNull().default('probable'),

    ...metadataFields,
  },
  (table) => [
    index('idx_sources_tenant').on(table.tenantId),
    index('idx_sources_type').on(table.tenantId, table.sourceType),
    index('idx_sources_search').using('gin', sql`to_tsvector('simple', ${table.title})`),
  ],
)

export const sourcesRelations = relations(sources, ({ many }) => ({
  citations: many(citations),
}))

export type Source = typeof sources.$inferSelect
export type InsertSource = typeof sources.$inferInsert
