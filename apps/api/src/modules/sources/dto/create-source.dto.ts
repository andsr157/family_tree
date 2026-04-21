import { z } from 'zod'

export const SOURCE_TYPES = [
  'vital_record',
  'census',
  'photograph',
  'oral_history',
  'book',
  'newspaper',
  'religious',
  'military',
  'legal',
  'website',
  'other',
] as const

export const CONFIDENCE_LEVELS = [
  'confirmed',
  'probable',
  'possible',
  'disputed',
] as const

export type SourceType = (typeof SOURCE_TYPES)[number]
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const createSourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  sourceType: z.enum(SOURCE_TYPES),
  author: z.string().max(300).optional().nullable(),
  publisher: z.string().max(300).optional().nullable(),
  publicationYear: z
    .number()
    .int()
    .min(1000, 'Year must be at least 1000')
    .max(2100, 'Year must be at most 2100')
    .optional()
    .nullable(),
  url: z.string().url('URL must be a valid URL').max(2048).optional().nullable(),
  urlAccessedAt: z
    .string()
    .date('urlAccessedAt must be YYYY-MM-DD')
    .optional()
    .nullable(),
  repository: z.string().max(500).optional().nullable(),
  callNumber: z.string().max(200).optional().nullable(),
  pageNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  confidence: z.enum(CONFIDENCE_LEVELS).default('probable'),
})

export type CreateSourceDto = z.infer<typeof createSourceSchema>
