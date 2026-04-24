import { randomBytes } from 'crypto'

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomChar(): string {
  // threshold = floor(256 / CHARSET.length) * CHARSET.length
  const threshold = Math.floor(256 / CHARSET.length) * CHARSET.length

  while (true) {
    const byte = randomBytes(1)[0]
    if (byte < threshold) {
      return CHARSET[byte % CHARSET.length]
    }
  }
}

/**
 * Generate invitation code in format XXXX-XXXX-XXXX-XXXX
 * Total 16 characters (without dash) = 32^16 ≈ 1.2 × 10^24 combinations
 *
 * Example output: "X7K2-9QMP-4RWN-J3VB"
 */
export function generateInvitationCode(): string {
  const segments: string[] = []

  for (let s = 0; s < 4; s++) {
    let segment = ''
    for (let i = 0; i < 4; i++) {
      segment += randomChar()
    }
    segments.push(segment)
  }

  return segments.join('-')
}

/**
 * Strip dashes from code for DB storage (16 chars, no dash)
 * "X7K2-9QMP-4RWN-J3VB" → "X7K29QMP4RWNJ3VB"
 */
export function normalizeCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase().trim()
}

/**
 * Format code from DB (16 chars) to display format (with dashes)
 * "X7K29QMP4RWNJ3VB" → "X7K2-9QMP-4RWN-J3VB"
 */
export function formatCode(raw: string): string {
  const clean = normalizeCode(raw)
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`
}

/**
 * Validate code format (with or without dashes)
 */
export function isValidCodeFormat(code: string): boolean {
  const clean = normalizeCode(code)
  if (clean.length !== 16) return false
  return [...clean].every((c) => CHARSET.includes(c))
}
