import { uuid, varchar, boolean, text, pgTable, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { users } from './users'
import { metadataFields } from './helpers'

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }),
    nickname: varchar('nickname', { length: 100 }),
    gender: varchar('gender', { length: 10 }).notNull(),
    is_alive: boolean('is_alive').notNull().default(true),
    bio: text('bio'),
    avatar_url: text('avatar_url'),
    is_private: boolean('is_private').notNull().default(false),
    linked_user_id: uuid('linked_user_id')
      .unique()
      .references(() => users.id, { onDelete: 'set null' }),
    is_claimable: boolean('is_claimable').notNull().default(false),
    ...metadataFields,
  },
  (table) => [
    index('idx_persons_tenant').on(table.tenant_id),
    index('idx_persons_name').using(
      'gin',
      sql`(${table.first_name} || ' ' || COALESCE(${table.last_name}, '')) gin_trgm_ops`,
    ),
    check('persons_gender_check', sql`${table.gender} IN ('male', 'female', 'other')`),
    check('chk_alive_if_linked', sql`${table.linked_user_id} IS NULL OR ${table.is_alive} = TRUE`),
    index('idx_persons_linked_user')
      .on(table.linked_user_id)
      .where(sql`${table.linked_user_id} IS NOT NULL`),
  ],
)
