import type { AppState } from '../types'
import { authHeaders } from './auth'
import { normalizeRemoteState } from './mergeState'

const PULL_INTERVAL_MS = 45_000

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'auth'

export type RemoteState = AppState & {
  savedAt?: string | null
  storage?: string
  error?: string
}

export type FetchResult = {
  state: AppState | null
  storage: string
  status: number
  error?: string
}

export async function fetchRemoteState(): Promise<FetchResult> {
  try {
    const res = await fetch('/api/state', { headers: authHeaders(), cache: 'no-store' })
    if (res.status === 401) {
      return { state: null, storage: 'none', status: 401, error: 'auth' }
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        state: null,
        storage: 'none',
        status: res.status,
        error: (err as { error?: string }).error ?? `HTTP ${res.status}`,
      }
    }
    const data = (await res.json()) as Record<string, unknown>
    return {
      state: normalizeRemoteState(data),
      storage: String(data.storage ?? 'unknown'),
      status: 200,
    }
  } catch {
    return { state: null, storage: 'none', status: 0, error: 'network' }
  }
}

export async function pushRemoteState(state: AppState): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        dailyLog: state.dailyLog,
        readingBooks: state.readingBooks ?? [],
        weightLog: state.weightLog ?? [],
      }),
    })
    if (res.status === 401) return { ok: false, error: 'auth' }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: (err as { error?: string }).error ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function checkPinRequired(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) return false
    const data = (await res.json()) as { required?: boolean }
    return data.required === true
  } catch {
    return false
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    return res.ok
  } catch {
    return false
  }
}

export { PULL_INTERVAL_MS }
