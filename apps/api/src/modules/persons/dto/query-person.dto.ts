import { z } from 'zod'

export const queryPersonSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
  isAlive: z.coerce.boolean().optional(),
  sort: z
    .enum(['firstName_asc', 'firstName_desc', 'lastName_asc', 'lastName_desc'])
    .default('firstName_asc'),
})

export type QueryPersonDto = z.infer<typeof queryPersonSchema>
