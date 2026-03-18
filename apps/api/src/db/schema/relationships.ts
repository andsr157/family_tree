import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  smallint,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { persons } from './persons'
import { metadataFields } from './helpers'

export const relationships = pgTable(
  'relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    person1Id: uuid('person1_id')
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    person2Id: uuid('person2_id')
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    subtype: varchar('subtype', { length: 20 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    order: smallint('order').notNull().default(1),
    notes: text('notes'),
    confidence: varchar('confidence', { length: 20 }).notNull().default('confirmed'),
    ...metadataFields,
  },
  (table) => [
    index('idx_rel_tenant').on(table.tenantId),
    index('idx_rel_person1').on(table.person1Id),
    index('idx_rel_person2').on(table.person2Id),
    uniqueIndex('rel_unique_pair').on(
      table.person1Id,
      table.person2Id,
      table.type,
      table.order,
    ),
    check('rel_type_check', sql`${table.type} IN ('couple', 'parent-child')`),
    check(
      'rel_confidence_check',
      sql`${table.confidence} IN ('confirmed', 'probable', 'estimated', 'disputed')`,
    ),
    check('rel_no_self_check', sql`${table.person1Id} <> ${table.person2Id}`),
  ],
)
