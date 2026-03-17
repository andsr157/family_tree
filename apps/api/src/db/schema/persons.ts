import { uuid, varchar, boolean, text, pgTable, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { users } from './users'
import { metadataFields } from './helpers'

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }),
    nickname: varchar('nickname', { length: 100 }),
    gender: varchar('gender', { length: 10 }).notNull(),
    isAlive: boolean('is_alive').notNull().default(true),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    isPrivate: boolean('is_private').notNull().default(false),
    linkedUserId: uuid('linked_user_id')
      .unique()
      .references(() => users.id, { onDelete: 'set null' }),
    isClaimable: boolean('is_claimable').notNull().default(false),
    ...metadataFields,
  },
  (table) => [
    index('idx_persons_tenant').on(table.tenantId),
    index('idx_persons_name').using(
      'gin',
      sql`(${table.firstName} || ' ' || COALESCE(${table.lastName}, '')) gin_trgm_ops`,
    ),
    check('persons_gender_check', sql`${table.gender} IN ('male', 'female', 'other')`),
    check('chk_alive_if_linked', sql`${table.linkedUserId} IS NULL OR ${table.isAlive} = TRUE`),
    index('idx_persons_linked_user')
      .on(table.linkedUserId)
      .where(sql`${table.linkedUserId} IS NOT NULL`),
  ],
)
