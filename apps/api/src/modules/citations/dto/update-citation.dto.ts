import { z } from 'zod'
import { CONFIDENCE_LEVELS } from '../../sources/dto/create-source.dto'

// sourceId, entityType, entityId are immutable after creation.
// To change the target, delete and recreate.
export const updateCitationSchema = z.object({
  detail: z.string().max(500).optional().nullable(),
  pageReference: z.string().max(200).optional().nullable(),
  confidence: z.enum(CONFIDENCE_LEVELS).optional(),
})

export type UpdateCitationDto = z.infer<typeof updateCitationSchema>
