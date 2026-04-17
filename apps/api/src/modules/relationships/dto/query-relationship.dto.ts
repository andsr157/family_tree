import { z } from 'zod'

export const queryRelationshipSchema = z.object({
  type: z.enum(['couple', 'parent-child']).optional(),
})

export type QueryRelationshipDto = z.infer<typeof queryRelationshipSchema>
