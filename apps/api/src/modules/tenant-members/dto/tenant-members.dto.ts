import { z } from 'zod'

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
  // owner cannot be changed via this endpoint — must transfer ownership
})

export const updateMemberStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
})

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>
export type UpdateMemberStatusDto = z.infer<typeof updateMemberStatusSchema>
