import { uuid, varchar, timestamp, pgTable, check, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { users } from './users'
import { metadataFields } from './helpers'

export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    ...metadataFields,
  },
  (table) => [
    uniqueIndex('tenant_members_tenant_user_unique').on(table.tenantId, table.userId),
    index('idx_tenant_members_tenant').on(table.tenantId),
    index('idx_tenant_members_user').on(table.userId),
    check('tenant_members_role_check', sql`${table.role} IN ('owner', 'admin', 'member')`),
    check('tenant_members_status_check', sql`${table.status} IN ('active', 'suspended', 'left')`),
  ],
)
