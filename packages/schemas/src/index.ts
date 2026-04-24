import { z } from 'zod'

// ─── Schema yang sudah ada (tidak berubah) ────────────────────────────────

export const registerTenantSchema = z.object({
  tenantName: z.string().min(3, 'Nama keluarga minimal 3 karakter').max(255),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung',
    ),
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Schema BARU ──────────────────────────────────────────────────────────

/**
 * Register akun saja — tanpa membuat tenant.
 * User akan memilih: buat tenant baru atau gabung via kode undangan
 * setelah login pertama kali.
 */
export const registerSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

/**
 * Buat tenant baru — dipanggil setelah user sudah login
 * tapi belum punya tenant.
 */
export const createTenantSchema = z.object({
  tenantName: z.string().min(3, 'Nama keluarga minimal 3 karakter').max(255),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung',
    ),
})

/**
 * Gabung ke tenant yang sudah ada via kode undangan.
 * Menerima format dengan dash (X7K2-9QMP-4RWN-J3VB)
 * atau tanpa dash (X7K29QMP4RWNJ3VB).
 */
export const joinTenantSchema = z.object({
  code: z
    .string()
    .min(1, 'Kode undangan wajib diisi')
    .transform((val) => val.replace(/-/g, '').toUpperCase().trim())
    .refine((val) => val.length === 16, {
      message: 'Kode undangan tidak valid — harus 16 karakter',
    }),
})

// ─── Types ────────────────────────────────────────────────────────────────

export type RegisterTenantInput = z.infer<typeof registerTenantSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type JoinTenantInput = z.infer<typeof joinTenantSchema>
