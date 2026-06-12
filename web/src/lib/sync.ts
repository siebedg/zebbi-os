import type { AppState } from '../types'

const TOKEN = import.meta.env.VITE_ZEEBI_SYNC_TOKEN as string | undefined

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

export type RemoteState = AppState & { savedAt?: string | null; storage?: string }

function authHeaders(): HeadersInit {
  if (!TOKEN) return {}
  return { Authorization: `Bearer ${TOKEN}` }
}

export async function fetchRemoteState(): Promise<RemoteState | null> {
  try {
    const res = await fetch('/api/state', { headers: authHeaders() })
    if (!res.ok) return null
    const data = (await res.json()) as RemoteState
    if (!Array.isArray(data.dailyLog)) return null
    return data
  } catch {
    return null
  }
}

export async function pushRemoteState(state: AppState): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ dailyLog: state.dailyLog }),
    })
    return res.ok
  } catch {
    return false
  }
}
