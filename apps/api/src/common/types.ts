import type { TenantRole } from '@family-tree/types'
export type { TenantRole }

export interface ServiceContext {
  tenantId: string
  userId: string
  userRole: TenantRole
}

// for  system operations where there is no actual user, we can use a special context
export const createSystemContext = (tenantId: string): ServiceContext => ({
  tenantId,
  userId: 'system',
  userRole: 'owner',
})
