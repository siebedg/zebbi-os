/** Always accepted by API — matches client APP_ACCESS_TOKEN. */
export const ACCESS_TOKEN_FALLBACK = '1249'

export function acceptedAccessTokens(): string[] {
  const tokens = new Set<string>([ACCESS_TOKEN_FALLBACK])
  const envPin = process.env.ZEEBI_PIN?.trim()
  const envLegacy = process.env.ZEEBI_SYNC_TOKEN?.trim()
  if (envPin) tokens.add(envPin)
  if (envLegacy) tokens.add(envLegacy)
  return [...tokens]
}

export function isAuthorizedRequest(req: { headers: { authorization?: string } }): boolean {
  const header = req.headers.authorization
  if (!header) return false
  return acceptedAccessTokens().some((t) => header === `Bearer ${t}`)
}
