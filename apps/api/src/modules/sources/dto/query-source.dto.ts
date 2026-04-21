import { z } from 'zod'
import { SOURCE_TYPES, CONFIDENCE_LEVELS } from './create-source.dto'

export const querySourceSchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(SOURCE_TYPES).optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['title_asc', 'created_at_desc']).default('created_at_desc'),
})

export type QuerySourceDto = z.infer<typeof querySourceSchema>
