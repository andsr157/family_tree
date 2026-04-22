import { z } from 'zod'

export const nodePositionsSchema = z.object({
  positions: z.record(
    z.object({
      x: z.number(),
      y: z.number(),
    }),
  ),
})

export type NodePositionsDto = z.infer<typeof nodePositionsSchema>
