import { z } from 'zod'

export const graphQuerySchema = z.object({
  focalPersonId: z.string().uuid('focalPersonId must be a valid UUID').optional(),
  depth: z.coerce.number().int().min(1).max(5).default(2),
})

export const graphExpandSchema = z.object({
  personId: z.string().uuid('personId must be a valid UUID'),
  direction: z.enum(['ancestors', 'descendants']),
  currentDepth: z.coerce.number().int().min(1).max(5).default(2),
})

export type GraphQueryDto = z.infer<typeof graphQuerySchema>
export type GraphExpandDto = z.infer<typeof graphExpandSchema>

export interface GraphNode {
  id: string
  firstName: string
  lastName: string | null
  nickname: string | null
  gender: string
  isAlive: boolean
  avatarUrl: string | null
  generation: number // 0 = focal, positive = ancestors, negative = descendants
  hasMoreAncestors: boolean // show expand button upward
  hasMoreDescendants: boolean // show expand button downward
  isLinkedToUser: boolean
  isClaimable: boolean
  isPrivate: boolean
}

export interface GraphEdge {
  id: string
  source: string // person1Id
  target: string // person2Id
  type: 'parent-child' | 'couple'
  subtype: string | null
  confidence: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  focalPersonId: string
  totalNodes: number
}
