import {
  pgTable,
  uuid,
  varchar,
  boolean,
  smallint,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { tenants } from './tenants'

export const tenantInvitations = pgTable(
  'tenant_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 16 }).notNull().unique(),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    label: varchar('label', { length: 100 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    maxUses: smallint('max_uses'),
    usedCount: smallint('used_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tenant_invitations_tenant').on(table.tenantId),
    index('idx_tenant_invitations_code').on(table.code),
    check('tenant_invitations_role_check', sql`${table.role} IN ('admin', 'member')`),
  ],
)

export const tenantInvitationsRelations = relations(tenantInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantInvitations.tenantId],
    references: [tenants.id],
  }),
}))

export type TenantInvitation = typeof tenantInvitations.$inferSelect
export type InsertTenantInvitation = typeof tenantInvitations.$inferInsert
