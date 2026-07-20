import { APP_ACCESS_TOKEN } from './accessConfig'

const UNLOCK_KEY = 'zebbi-unlocked'
const SESSION_KEY = 'zebbi-access-pin'
export const AUTH_LOST_EVENT = 'zebbi-auth-lost'

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function setUnlocked(on: boolean): void {
  try {
    if (on) localStorage.setItem(UNLOCK_KEY, '1')
    else localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
  if (on) ensureAccessToken()
  else clearAccessToken()
}

/** Always attach the baked-in API token once the pattern gate is open. */
export function ensureAccessToken(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, APP_ACCESS_TOKEN)
    localStorage.setItem(SESSION_KEY, APP_ACCESS_TOKEN)
  } catch {
    /* ignore */
  }
}

export function getAccessPin(): string | null {
  try {
    return (
      sessionStorage.getItem(SESSION_KEY) ||
      localStorage.getItem(SESSION_KEY) ||
      (isUnlocked() ? APP_ACCESS_TOKEN : null)
    )
  } catch {
    return isUnlocked() ? APP_ACCESS_TOKEN : null
  }
}

/** @deprecated use ensureAccessToken / setUnlocked */
export function setAccessPin(_pin: string): void {
  ensureAccessToken()
  setUnlocked(true)
}

export function clearAccessPin(): void {
  clearAccessToken()
}

function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function signalAuthLost(): void {
  // Do not wipe unlock — pattern stays; just re-assert API token.
  if (isUnlocked()) ensureAccessToken()
  window.dispatchEvent(new Event(AUTH_LOST_EVENT))
}

export function authHeaders(): HeadersInit {
  const token = getAccessPin() ?? (isUnlocked() ? APP_ACCESS_TOKEN : null)
  if (token) return { Authorization: `Bearer ${token}` }
  const legacy = import.meta.env.VITE_ZEEBI_SYNC_TOKEN as string | undefined
  if (legacy) return { Authorization: `Bearer ${legacy}` }
  return {}
}
