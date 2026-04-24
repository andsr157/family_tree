import { z } from 'zod'

export const createInvitationSchema = z.object({
  role: z.enum(['admin', 'member']).default('member'),
  label: z.string().max(100).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(8760).optional().nullable(),
  maxUses: z.number().int().min(1).max(100).optional().nullable(),
})

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>
