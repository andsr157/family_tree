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
    fullName: varchar('full_name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
    defaultFocalPersonId: uuid('default_focal_person_id'),
    preferredZoomLevel: smallint('preferred_zoom_level').notNull().default(2),
    ...metadataFields,
  },
  (table) => [
    check('preferred_zoom_level_check', sql`${table.preferredZoomLevel} IN (1, 2, 3)`),
    index('idx_users_email').on(table.email),
  ],
)
