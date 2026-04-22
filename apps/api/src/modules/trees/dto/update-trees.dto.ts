import { z } from 'zod'
import { createFamilyTreeSchema } from './create-trees.dto'

// rootPersonId is immutable after creation
export const updateFamilyTreeSchema = createFamilyTreeSchema
  .omit({ rootPersonId: true })
  .partial()

export type UpdateFamilyTreeDto = z.infer<typeof updateFamilyTreeSchema>
