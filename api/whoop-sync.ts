import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  WHOOP_SYNC_FROM,
  authorized,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
    await clearTokens()
    return res.status(200).json({ ok: true, disconnected: true })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!whoopConfigured()) {
    return res.status(503).json({ error: 'Whoop niet geconfigureerd' })
  }

  try {
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

    return res.status(200).json({
      ok: true,
      syncFrom: WHOOP_SYNC_FROM,
      sleepsFetched: sleeps.length,
      daysUpdated: updatedDates.length,
      updatedDates,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync mislukt'
    return res.status(500).json({ error: msg })
  }
}
