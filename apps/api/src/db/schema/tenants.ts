import { uuid, varchar, text, pgTable } from 'drizzle-orm/pg-core'
import { metadataFields } from './helpers'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  ...metadataFields,
})
