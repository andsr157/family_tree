import { z } from 'zod'
import { createSourceSchema } from './create-source.dto'

export const updateSourceSchema = createSourceSchema.partial()

export type UpdateSourceDto = z.infer<typeof updateSourceSchema>
