import { z } from 'zod'

export const EVENT_TYPES = [
  'birth',
  'death',
  'marriage',
  'divorce',
  'residence',
  'education',
  'occupation',
  'religion',
  'baptism',
  'burial',
  'other',
] as const

export const DATE_QUALIFIERS = ['exact', 'about', 'before', 'after', 'between'] as const

export type EventType = (typeof EVENT_TYPES)[number]
export type DateQualifier = (typeof DATE_QUALIFIERS)[number]

// Event types that must be unique per person (only one allowed)
export const UNIQUE_EVENT_TYPES: EventType[] = ['birth', 'death']

// Event types where relationship_id is relevant
export const RELATIONSHIP_EVENT_TYPES: EventType[] = ['marriage', 'divorce']

export const createEventSchema = z
  .object({
    personId: z.string().uuid('personId must be a valid UUID'),
    relationshipId: z
      .string()
      .uuid('relationshipId must be a valid UUID')
      .optional()
      .nullable(),
    type: z.enum(EVENT_TYPES),
    date: z.string().date('date must be in YYYY-MM-DD format').optional().nullable(),
    dateText: z
      .string()
      .max(100, 'dateText must be at most 100 characters')
      .optional()
      .nullable(),
    dateQualifier: z.enum(DATE_QUALIFIERS).default('exact'),
    place: z
      .string()
      .max(255, 'place must be at most 255 characters')
      .optional()
      .nullable(),
    placeDetail: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    isPrimary: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // relationshipId only relevant for marriage/divorce
    if (data.relationshipId && !RELATIONSHIP_EVENT_TYPES.includes(data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['relationshipId'],
        message: `relationshipId is only applicable for event types: ${RELATIONSHIP_EVENT_TYPES.join(', ')}`,
      })
    }

    // between qualifier should have dateText for range description
    if (data.dateQualifier === 'between' && !data.dateText && !data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateText'],
        message: 'dateText or date is recommended when dateQualifier is "between"',
      })
    }
  })

export type CreateEventDto = z.infer<typeof createEventSchema>
