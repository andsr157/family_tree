import {
  uuid,
  varchar,
  text,
  timestamp,
  smallint,
  boolean,
  pgTable,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { metadataFields } from './helpers'

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    full_name: varchar('full_name', { length: 255 }).notNull(),
    avatar_url: text('avatar_url'),
    email_verified_at: timestamp('email_verified_at', { withTimezone: true }),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    is_platform_admin: boolean('is_platform_admin').notNull().default(false),
    default_focal_person_id: uuid('default_focal_person_id'),
    preferred_zoom_level: smallint('preferred_zoom_level').notNull().default(2),
    ...metadataFields,
  },
  (table) => [
    check('preferred_zoom_level_check', sql`${table.preferred_zoom_level} IN (1, 2, 3)`),
    index('idx_users_email').on(table.email),
  ],
)
