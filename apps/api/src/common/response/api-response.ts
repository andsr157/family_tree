import type { ApiResponse } from '@family-tree/types'

export type { ApiResponse } from '@family-tree/types'

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message: message ?? null,
    errors: null,
    timestamp: new Date().toISOString(),
  }
}

export function errorResponse(
  message: string,
  errors?: Record<string, string[]>,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    errors: errors ?? null,
    timestamp: new Date().toISOString(),
  }
}
