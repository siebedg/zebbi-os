/** Shared Whoop OAuth + sleep sync helpers (used by api/whoop-*.ts). */

export const WHOOP_SYNC_FROM = (process.env.WHOOP_SYNC_FROM || '2026-07-04').trim()
export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
export const WHOOP_API = 'https://api.prod.whoop.com'
export const WHOOP_SCOPES = 'read:sleep offline'
export const WHOOP_TOKENS_KEY = 'zebbi-os:whoop-tokens'
export const WHOOP_STATE_PREFIX = 'zebbi-os:whoop-oauth-state:'
export const CANONICAL_REDIRECT_URI = 'https://zebbi-os.vercel.app/api/whoop-callback'

export type WhoopTokens = {
  access_token: string
  refresh_token?: string
  expires_at: number
  token_type?: string
  scope?: string
  connected_at?: string
}

export type WhoopSleep = {
  id: string
  start: string
  end: string
  timezone_offset?: string
  nap?: boolean
  score_state?: string
  score?: {
    sleep_performance_percentage?: number
    stage_summary?: {
      total_in_bed_time_milli?: number
    }
  }
}

export type SleepPatch = {
  date: string
  wakeTime?: string
  bedTime?: string
  sleepScore?: number
  sleepHours?: number
  source: 'whoop'
}

export function whoopClientId(): string {
  return (process.env.WHOOP_CLIENT_ID || '').trim()
}

export function whoopClientSecret(): string {
  return (process.env.WHOOP_CLIENT_SECRET || '').trim()
}

export function whoopConfigured(): boolean {
  return Boolean(whoopClientId() && whoopClientSecret())
}

/** Always prefer the URI registered in the Whoop dashboard. */
export function whoopRedirectUri(reqHost?: string): string {
  const fromEnv = (process.env.WHOOP_REDIRECT_URI || '').trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (reqHost?.includes('localhost') || reqHost?.startsWith('127.0.0.1')) {
    const proto = 'http'
    return `${proto}://${reqHost}/api/whoop-callback`
  }
  return CANONICAL_REDIRECT_URI
}

/** Apply timezone_offset like "+02:00" / "-05:00" to an ISO instant → local calendar parts. */
export function localPartsFromWhoop(iso: string, offset?: string): {
  date: string
  time: string
} {
  const d = new Date(iso)
  if (!offset || !/^[+-]\d{2}:\d{2}$/.test(offset)) {
    // Fallback: Europe/Brussels-ish via server local — better use offset when present
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
  }
  const sign = offset[0] === '-' ? -1 : 1
  const [oh, om] = offset.slice(1).split(':').map(Number)
  const shiftMs = sign * (oh * 60 + om) * 60_000
  const local = new Date(d.getTime() + shiftMs)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, '0')
  const day = String(local.getUTCDate()).padStart(2, '0')
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
}

function prevDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

function hoursBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.round((ms / 3_600_000) * 100) / 100
}

/** Map one Whoop sleep → wake-day patch + optional bed-day patch. */
export function mapWhoopSleep(sleep: WhoopSleep, syncFrom = WHOOP_SYNC_FROM): SleepPatch[] {
  if (sleep.nap) return []
  if (sleep.score_state && sleep.score_state !== 'SCORED') return []

  const wake = localPartsFromWhoop(sleep.end, sleep.timezone_offset)
  if (wake.date < syncFrom) return []

  const bed = localPartsFromWhoop(sleep.start, sleep.timezone_offset)
  const bedDate = bed.date === wake.date ? prevDate(wake.date) : bed.date

  const scorePct = sleep.score?.sleep_performance_percentage
  const patches: SleepPatch[] = [
    {
      date: wake.date,
      wakeTime: wake.time,
      sleepScore: scorePct != null ? Math.round(scorePct) / 100 : undefined,
      sleepHours: hoursBetween(sleep.start, sleep.end),
      source: 'whoop',
    },
  ]

  // Bed on previous calendar day (Whoop-style). Allow writing bedTime even if
  // that calendar day is before syncFrom — but only the bedTime field.
  patches.push({
    date: bedDate,
    bedTime: bed.time,
    source: 'whoop',
  })

  return patches
}

export function mergeWhoopPatches(
  dailyLog: Record<string, unknown>[],
  patches: SleepPatch[],
  syncFrom = WHOOP_SYNC_FROM,
): { log: Record<string, unknown>[]; updatedDates: string[] } {
  const map = new Map<string, Record<string, unknown>>()
  for (const e of dailyLog) {
    const date = String(e.date ?? '')
    if (date) map.set(date, { ...e })
  }

  const updated = new Set<string>()
  const now = new Date().toISOString()

  for (const p of patches) {
    const existing = map.get(p.date) ?? { date: p.date }
    const next = { ...existing, date: p.date }
    let changed = false

    if (p.date >= syncFrom) {
      if (p.wakeTime != null && next.wakeTime !== p.wakeTime) {
        next.wakeTime = p.wakeTime
        changed = true
      }
      if (p.sleepScore != null && next.sleepScore !== p.sleepScore) {
        next.sleepScore = p.sleepScore
        changed = true
      }
      if (p.sleepHours != null && next.sleepHours !== p.sleepHours) {
        next.sleepHours = p.sleepHours
        changed = true
      }
      if (p.bedTime != null && next.bedTime !== p.bedTime) {
        next.bedTime = p.bedTime
        changed = true
      }
    } else if (p.bedTime != null && next.bedTime == null) {
      // Pre-syncFrom day: only fill empty bedTime for a sleep that wakes on/after syncFrom
      next.bedTime = p.bedTime
      changed = true
    }

    if (!changed) continue

    next.updatedAt = now
    next.whoopSyncedAt = now
    map.set(p.date, next)
    updated.add(p.date)
  }

  return {
    log: [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    updatedDates: [...updated].sort(),
  }
}

export async function exchangeCode(code: string, redirectUri: string): Promise<WhoopTokens> {
  const clientId = whoopClientId()
  const clientSecret = whoopClientSecret()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const r = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await r.json()) as Record<string, unknown>
  if (!r.ok || !data.access_token) {
    throw new Error(String(data.error_description || data.error || 'Token exchange failed'))
  }
  const expiresIn = Number(data.expires_in ?? 3600)
  return {
    access_token: String(data.access_token),
    refresh_token: data.refresh_token ? String(data.refresh_token) : undefined,
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
    token_type: data.token_type ? String(data.token_type) : 'Bearer',
    scope: data.scope ? String(data.scope) : undefined,
    connected_at: new Date().toISOString(),
  }
}

export async function refreshTokens(tokens: WhoopTokens): Promise<WhoopTokens> {
  if (!tokens.refresh_token) throw new Error('Geen refresh token — verbind Whoop opnieuw')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: whoopClientId(),
    client_secret: whoopClientSecret(),
    scope: WHOOP_SCOPES,
  })
  const r = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await r.json()) as Record<string, unknown>
  if (!r.ok || !data.access_token) {
    throw new Error(String(data.error_description || data.error || 'Refresh failed'))
  }
  const expiresIn = Number(data.expires_in ?? 3600)
  return {
    access_token: String(data.access_token),
    // Whoop rotates refresh tokens — always store the new one
    refresh_token: data.refresh_token ? String(data.refresh_token) : tokens.refresh_token,
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
    token_type: data.token_type ? String(data.token_type) : 'Bearer',
    scope: data.scope ? String(data.scope) : tokens.scope,
    connected_at: tokens.connected_at,
  }
}

export async function createOAuthState(): Promise<string> {
  const state = crypto.randomUUID().replace(/-/g, '')
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv')
    await kv.set(`${WHOOP_STATE_PREFIX}${state}`, { createdAt: Date.now() }, { ex: 600 })
  }
  return state
}

export async function consumeOAuthState(state: string | null): Promise<boolean> {
  if (!state) return false
  if (!process.env.KV_REST_API_URL) return state.length >= 8
  const { kv } = await import('@vercel/kv')
  const key = `${WHOOP_STATE_PREFIX}${state}`
  const existing = await kv.get(key)
  if (!existing) return false
  await kv.del(key)
  return true
}

export async function loadTokens(): Promise<WhoopTokens | null> {
  if (!process.env.KV_REST_API_URL) return null
  const { kv } = await import('@vercel/kv')
  return (await kv.get<WhoopTokens>(WHOOP_TOKENS_KEY)) ?? null
}

export async function saveTokens(tokens: WhoopTokens): Promise<void> {
  if (!process.env.KV_REST_API_URL) throw new Error('KV niet geconfigureerd')
  const { kv } = await import('@vercel/kv')
  await kv.set(WHOOP_TOKENS_KEY, tokens)
}

export async function clearTokens(): Promise<void> {
  if (!process.env.KV_REST_API_URL) return
  const { kv } = await import('@vercel/kv')
  await kv.del(WHOOP_TOKENS_KEY)
}

export async function getValidAccessToken(): Promise<string> {
  let tokens = await loadTokens()
  if (!tokens) throw new Error('Whoop niet verbonden')
  if (Date.now() >= tokens.expires_at) {
    tokens = await refreshTokens(tokens)
    await saveTokens(tokens)
  }
  return tokens.access_token
}

export async function fetchSleepsSince(startIso: string): Promise<WhoopSleep[]> {
  const access = await getValidAccessToken()
  const all: WhoopSleep[] = []
  let nextToken: string | undefined

  do {
    const url = new URL(`${WHOOP_API}/developer/v2/activity/sleep`)
    url.searchParams.set('start', startIso)
    url.searchParams.set('limit', '25')
    if (nextToken) url.searchParams.set('nextToken', nextToken)

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    })
    if (!r.ok) {
      const text = await r.text()
      throw new Error(`Whoop sleep API ${r.status}: ${text.slice(0, 200)}`)
    }
    const data = (await r.json()) as { records?: WhoopSleep[]; next_token?: string }
    all.push(...(data.records ?? []))
    nextToken = data.next_token || undefined
  } while (nextToken)

  return all
}

export function authorized(req: { headers: { authorization?: string } }): boolean {
  const pin = (process.env.ZEEBI_PIN ?? process.env.ZEEBI_SYNC_TOKEN ?? '1249').trim()
  if (!pin) return true
  return req.headers.authorization === `Bearer ${pin}`
}
