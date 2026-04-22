import { z } from 'zod'

export const COLLABORATOR_ROLES = ['owner', 'editor', 'viewer'] as const
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number]

export const inviteCollaboratorSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  role: z.enum(['editor', 'viewer']).default('viewer'), // owner cannot be assigned via invite
})

export const updateCollaboratorSchema = z.object({
  role: z.enum(['editor', 'viewer']), // owner role cannot be changed via this endpoint
})

export type InviteCollaboratorDto = z.infer<typeof inviteCollaboratorSchema>
export type UpdateCollaboratorDto = z.infer<typeof updateCollaboratorSchema>
