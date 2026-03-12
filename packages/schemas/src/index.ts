import { z } from 'zod'

export const registerTenantSchema = z.object({
  tenantName: z.string().min(3, 'Family name must be at least 3 characters').max(255),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type RegisterTenantInput = z.infer<typeof registerTenantSchema>
export type LoginInput = z.infer<typeof loginSchema>
