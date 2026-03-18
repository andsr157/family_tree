import { z } from 'zod'

export const createPersonSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional(),
  nickname: z.string().max(100).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']),
  isAlive: z.boolean().default(true),
  bio: z.string().max(2000).optional(),
  isPrivate: z.boolean().default(false),
  isClaimable: z.boolean().default(false),
})

export type CreatePersonDto = z.infer<typeof createPersonSchema>
