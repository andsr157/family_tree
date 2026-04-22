import { pgTable, uuid, varchar, text, jsonb, check } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { tenants } from './tenants'
import { persons } from './persons'
import { treeCollaborators } from './tree_collaborators'
import { metadataFields } from './helpers'

export const familyTrees = pgTable(
  'family_trees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    rootPersonId: uuid('root_person_id')
      .notNull()
      .references(() => persons.id),
    visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
    // settings stores: { nodePositions: { [personId]: { x, y } }, ...other prefs }
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
    defaultFocalPersonId: uuid('default_focal_person_id').references(() => persons.id, {
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

export const familyTreesRelations = relations(familyTrees, ({ one, many }) => ({
  rootPerson: one(persons, {
    fields: [familyTrees.rootPersonId],
    references: [persons.id],
    relationName: 'rootPerson',
  }),
  defaultFocalPerson: one(persons, {
    fields: [familyTrees.defaultFocalPersonId],
    references: [persons.id],
    relationName: 'defaultFocalPerson',
  }),
  collaborators: many(treeCollaborators),
}))
