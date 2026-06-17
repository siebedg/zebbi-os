const SESSION_KEY = 'zebbi-access-pin'

/** PIN ingevoerd door gebruiker — niet in de build, per browser/sessie */
export function getAccessPin(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function setAccessPin(pin: string): void {
  sessionStorage.setItem(SESSION_KEY, pin.trim())
}

export function clearAccessPin(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function authHeaders(): HeadersInit {
  const pin = getAccessPin()
  if (pin) return { Authorization: `Bearer ${pin}` }
  const legacy = import.meta.env.VITE_ZEEBI_SYNC_TOKEN as string | undefined
  if (legacy) return { Authorization: `Bearer ${legacy}` }
  return {}
}
