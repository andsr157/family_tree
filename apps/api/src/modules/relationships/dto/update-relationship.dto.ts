import { z } from 'zod'

// cannot change person1Id, person2Id, or type.
// If need to change, must delete and create new relationship
export const updateRelationshipSchema = z.object({
  subtype: z.string().max(20).optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  order: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional().nullable(),
  confidence: z.enum(['confirmed', 'probable', 'estimated', 'disputed']).optional(),
})

export type UpdateRelationshipDto = z.infer<typeof updateRelationshipSchema>
