import { z } from 'zod'
import { CONFIDENCE_LEVELS } from '../../sources/dto/create-source.dto'

export const ENTITY_TYPES = ['person', 'event', 'relationship'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const createCitationSchema = z.object({
  sourceId: z.string().uuid('sourceId must be a valid UUID'),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().uuid('entityId must be a valid UUID'),
  detail: z.string().max(500).optional().nullable(),
  pageReference: z.string().max(200).optional().nullable(),
  confidence: z.enum(CONFIDENCE_LEVELS).default('probable'),
})

export type CreateCitationDto = z.infer<typeof createCitationSchema>
