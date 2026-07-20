/**
 * Local unlock = draw this pattern (3×3, indices 0–8 left→right, top→bottom).
 * Z-shape: top row → diagonal → bottom row.
 */
export const UNLOCK_PATTERN = [0, 1, 2, 4, 6, 7, 8] as const

/**
 * Token sent to the API after unlock. Server accepts this even if Vercel env differs.
 * Not a user-facing PIN — you never type it.
 */
export const APP_ACCESS_TOKEN = '1249'
