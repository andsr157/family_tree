import { z } from 'zod'
import { createPersonSchema } from './create-person.dto'

export const updatePersonSchema = createPersonSchema.partial()
export type UpdatePersonDto = z.infer<typeof updatePersonSchema>
