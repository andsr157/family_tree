import { uuid, timestamp } from 'drizzle-orm/pg-core'

export const metadataFields = {
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  created_by: uuid('created_by'),
  updated_by: uuid('updated_by'),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  deleted_by: uuid('deleted_by'),
}
