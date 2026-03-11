import { pgTable, uuid, varchar, date, text, boolean, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { persons } from './persons'
import { relationships } from './relationships'
import { metadataFields } from './helpers'

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    person_id: uuid('person_id')
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    relationship_id: uuid('relationship_id').references(() => relationships.id, {
      onDelete: 'set null',
    }),
    type: varchar('type', { length: 30 }).notNull(),
    date: date('date'),
    date_text: varchar('date_text', { length: 100 }),
    date_qualifier: varchar('date_qualifier', { length: 20 }).notNull().default('exact'),
    place: varchar('place', { length: 255 }),
    place_detail: text('place_detail'),
    description: text('description'),
    is_primary: boolean('is_primary').notNull().default(false),
    ...metadataFields,
  },
  (table) => [
    index('idx_events_person').on(table.person_id),
    index('idx_events_type').on(table.type),
    check(
      'events_type_check',
      sql`${table.type} IN ('birth','death','marriage','divorce','residence','education','occupation','religion','baptism','burial','other')`,
    ),
    check(
      'events_date_qualifier_check',
      sql`${table.date_qualifier} IN ('exact','about','before','after','between')`,
    ),
  ],
)
