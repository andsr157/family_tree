import { z } from 'zod'
import { EVENT_TYPES } from './create-event.dto'

export const queryEventSchema = z.object({
  type: z.enum(EVENT_TYPES).optional(),
})

export type QueryEventDto = z.infer<typeof queryEventSchema>
