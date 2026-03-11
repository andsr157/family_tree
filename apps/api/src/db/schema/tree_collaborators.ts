import { pgTable, uuid, varchar, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { familyTrees } from './family_trees'
import { users } from './users'
import { metadataFields } from './helpers'

export const treeCollaborators = pgTable(
  'tree_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tree_id: uuid('tree_id')
      .notNull()
      .references(() => familyTrees.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('viewer'),
    invited_by: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    invited_at: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    ...metadataFields,
  },
  (table) => [
    uniqueIndex('tree_collaborators_tree_user_unique').on(table.tree_id, table.user_id),
    check('tree_collaborators_role_check', sql`${table.role} IN ('owner', 'editor', 'viewer')`),
  ],
)
