// Shared TypeScript interfaces

// ─── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string | null
  errors: Record<string, string[]> | null
  timestamp: string
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

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
