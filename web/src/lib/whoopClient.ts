import { authHeaders, signalAuthLost } from './auth'

export type WhoopStatus = {
  configured: boolean
  connected: boolean
  connectedAt: string | null
  syncFrom: string
  redirectUri?: string
}

export type WhoopSyncResult = {
  ok: boolean
  syncFrom?: string
  sleepsFetched?: number
  daysUpdated?: number
  updatedDates?: string[]
  error?: string
}

async function parseJson<T>(r: Response): Promise<T & { error?: string }> {
  try {
    return (await r.json()) as T & { error?: string }
  } catch {
    return { error: 'Ongeldige response' } as T & { error?: string }
  }
}

export async function fetchWhoopStatus(): Promise<WhoopStatus> {
  const r = await fetch('/api/whoop-status', { headers: authHeaders(), cache: 'no-store' })
  if (r.status === 401) {
    signalAuthLost()
    return { configured: false, connected: false, connectedAt: null, syncFrom: '2026-07-04' }
  }
  const data = await parseJson<WhoopStatus>(r)
  return {
    configured: Boolean(data.configured),
    connected: Boolean(data.connected),
    connectedAt: data.connectedAt ?? null,
    syncFrom: data.syncFrom ?? '2026-07-04',
    redirectUri: data.redirectUri,
  }
}

export async function startWhoopConnect(): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch('/api/whoop-auth', { headers: authHeaders(), cache: 'no-store' })
  if (r.status === 401) {
    signalAuthLost()
    return { ok: false, error: 'PIN vereist' }
  }
  const data = await parseJson<{ url?: string }>(r)
  if (!r.ok || !data.url) return { ok: false, error: data.error ?? 'Kon Whoop auth niet starten' }
  window.location.href = data.url
  return { ok: true }
}

export async function syncWhoop(): Promise<WhoopSyncResult> {
  const r = await fetch('/api/whoop-sync', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  })
  if (r.status === 401) {
    signalAuthLost()
    return { ok: false, error: 'PIN vereist' }
  }
  const data = await parseJson<WhoopSyncResult>(r)
  if (!r.ok) return { ok: false, error: data.error ?? 'Sync mislukt' }
  return { ...data, ok: true }
}

export async function disconnectWhoop(): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch('/api/whoop-sync', {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (r.status === 401) {
    signalAuthLost()
    return { ok: false, error: 'PIN vereist' }
  }
  const data = await parseJson<{ ok?: boolean }>(r)
  if (!r.ok) return { ok: false, error: data.error ?? 'Disconnect mislukt' }
  return { ok: true }
}
