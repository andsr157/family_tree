import type { AuthUser, TenantRole } from '@family-tree/types'

// Re-export for convenience within the API codebase
export type { AuthUser as RequestUser } from '@family-tree/types'

export interface SessionData {
  userId: string
  createdAt: string
  lastActiveAt: string
  deviceInfo: {
    userAgent: string
    ip: string
  }
}

export interface RequestWithAuth extends Request {
  user: AuthUser
  tenantId: string
  userRole: TenantRole
}
