// Shared TypeScript interfaces

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string | null
  errors: Record<string, string[]> | null
  timestamp: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  isPlatformAdmin: boolean
  defaultFocalPersonId: string | null
  preferredZoomLevel: number
}

export type TenantRole = 'owner' | 'admin' | 'member'

export interface TenantInfo {
  id: string
  name: string
  slug: string
  role: TenantRole
}
