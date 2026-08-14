const KEY = 'zebbi-shutdown-session'
const EVENT = 'zebbi-shutdown-session'

export type ShutdownSession = {
  startedAt: number
  timerMinutes: number
  templateId: string
  killDone: boolean
  checked: string[]
}

export function loadShutdownSession(): ShutdownSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShutdownSession
    if (!parsed?.startedAt || !parsed.timerMinutes || !parsed.templateId) return null
    const maxAge = parsed.timerMinutes * 60 * 1000 + 4 * 60 * 60 * 1000
    if (Date.now() - parsed.startedAt > maxAge) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveShutdownSession(session: ShutdownSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore */
  }
}

export function clearShutdownSession(): void {
  try {
    localStorage.removeItem(KEY)
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* ignore */
  }
}

export function sessionSecondsLeft(session: ShutdownSession, now = Date.now()): number {
  return Math.max(0, session.timerMinutes * 60 - Math.floor((now - session.startedAt) / 1000))
}

export function subscribeShutdownSession(onChange: () => void): () => void {
  const handler = () => onChange()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export { EVENT as SHUTDOWN_SESSION_EVENT }
