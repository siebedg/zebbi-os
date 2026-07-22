import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ACCESS_TOKEN_FALLBACK, isAuthorizedRequest } from '../lib/access'
import {
  WHOOP_SYNC_FROM,
  clearTokens,
  fetchSleepsSince,
  mapWhoopSleep,
  mergeWhoopPatches,
  whoopConfigured,
} from '../lib/whoop'

const KV_KEY = 'zebbi-os:state'

type StoredState = {
  dailyLog: Record<string, unknown>[]
  readingBooks?: unknown[]
  weightLog?: unknown[]
  savedAt?: string
}

async function readState(): Promise<StoredState | null> {
  if (!process.env.KV_REST_API_URL) return null
  const { kv } = await import('@vercel/kv')
  return (await kv.get<StoredState>(KV_KEY)) ?? null
}

async function writeState(state: StoredState): Promise<void> {
  if (!process.env.KV_REST_API_URL) throw new Error('KV niet geconfigureerd')
  const { kv } = await import('@vercel/kv')
  await kv.set(KV_KEY, state)
}

/** Vercel Cron (GET) or manual sync (POST) with PIN / CRON_SECRET. */
function canSync(req: VercelRequest): boolean {
  if (isAuthorizedRequest(req)) return true

  const auth = req.headers.authorization
  const cronSecret = (process.env.CRON_SECRET || ACCESS_TOKEN_FALLBACK).trim()
  if (auth === `Bearer ${cronSecret}`) return true

  // Vercel Cron invocations include this header
  if (req.headers['x-vercel-cron'] === '1') return true

  return false
}

async function runWhoopSync(): Promise<{
  ok: true
  syncFrom: string
  sleepsFetched: number
  daysUpdated: number
  updatedDates: string[]
}> {
  const startIso = `${WHOOP_SYNC_FROM}T00:00:00.000Z`
  const sleeps = await fetchSleepsSince(startIso)
  const patches = sleeps.flatMap((s) => mapWhoopSleep(s, WHOOP_SYNC_FROM))

  const existing = (await readState()) ?? {
    dailyLog: [],
    readingBooks: [],
    weightLog: [],
  }

  const { log, updatedDates } = mergeWhoopPatches(
    (existing.dailyLog ?? []) as Record<string, unknown>[],
    patches,
    WHOOP_SYNC_FROM,
  )

  const next: StoredState = {
    ...existing,
    dailyLog: log,
    savedAt: new Date().toISOString(),
  }
  await writeState(next)

  return {
    ok: true,
    syncFrom: WHOOP_SYNC_FROM,
    sleepsFetched: sleeps.length,
    daysUpdated: updatedDates.length,
    updatedDates,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    if (!isAuthorizedRequest(req)) return res.status(401).json({ error: 'Unauthorized' })
    await clearTokens()
    return res.status(200).json({ ok: true, disconnected: true })
  }

  // Cron = GET; manual button = POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!canSync(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!whoopConfigured()) {
    return res.status(503).json({ error: 'Whoop niet geconfigureerd' })
  }

  try {
    const result = await runWhoopSync()
    return res.status(200).json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync mislukt'
    return res.status(500).json({ error: msg })
  }
}
