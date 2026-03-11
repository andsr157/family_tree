import { pgTable, uuid, varchar, text, jsonb, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { persons } from './persons'
import { metadataFields } from './helpers'

export const familyTrees = pgTable(
  'family_trees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    root_person_id: uuid('root_person_id')
      .notNull()
      .references(() => persons.id),
    visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    default_focal_person_id: uuid('default_focal_person_id').references(() => persons.id, {
      onDelete: 'set null',
    }),
    ...metadataFields,
  },
  (table) => [
    check(
      'family_trees_visibility_check',
      sql`${table.visibility} IN ('private', 'family', 'public')`,
    ),
  ],
)
