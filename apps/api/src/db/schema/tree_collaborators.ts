import { pgTable, uuid, varchar, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { familyTrees } from './family_trees'
import { users } from './users'
import { metadataFields } from './helpers'

export const treeCollaborators = pgTable(
  'tree_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id')
      .notNull()
      .references(() => familyTrees.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('viewer'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...metadataFields,
  },
  (table) => [
    uniqueIndex('tree_collaborators_tree_user_unique').on(table.treeId, table.userId),
    check('tree_collaborators_role_check', sql`${table.role} IN ('owner', 'editor', 'viewer')`),
  ],
)
