import { z } from 'zod'
import { DATE_QUALIFIERS, RELATIONSHIP_EVENT_TYPES } from './create-event.dto'

// personId and type are immutable after creation
export const updateEventSchema = z
  .object({
    relationshipId: z
      .string()
      .uuid('relationshipId must be a valid UUID')
      .optional()
      .nullable(),
    date: z.string().date('date must be in YYYY-MM-DD format').optional().nullable(),
    dateText: z
      .string()
      .max(100, 'dateText must be at most 100 characters')
      .optional()
      .nullable(),
    dateQualifier: z.enum(DATE_QUALIFIERS).optional(),
    place: z
      .string()
      .max(255, 'place must be at most 255 characters')
      .optional()
      .nullable(),
    placeDetail: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    isPrimary: z.boolean().optional(),
  })
  .strict()

export type UpdateEventDto = z.infer<typeof updateEventSchema>
export { RELATIONSHIP_EVENT_TYPES }
