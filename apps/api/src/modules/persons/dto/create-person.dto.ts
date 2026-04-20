import { z } from 'zod'

export const createPersonSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().nullable(),
  nickname: z.string().max(100).optional().nullable(),
  // Aligned with DB check constraint: ('male', 'female', 'other')
  gender: z.enum(['male', 'female', 'other']),
  isAlive: z.boolean().default(true),
  bio: z.string().max(2000).optional().nullable(),
  isPrivate: z.boolean().default(false),
  isClaimable: z.boolean().default(false),
})

export type CreatePersonDto = z.infer<typeof createPersonSchema>
