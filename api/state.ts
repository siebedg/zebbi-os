import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthorizedRequest } from '../lib/access'

const KV_KEY = 'zebbi-os:state'
const BLOB_PATH = 'zebbi-os/state.json'

type StoredState = {
  dailyLog: unknown[]
  readingBooks?: unknown[]
  weightLog?: unknown[]
  savedAt?: string
}

function authorized(req: VercelRequest): boolean {
  return isAuthorizedRequest(req)
}

function entryStamp(e: { updatedAt?: string; date?: string }): string {
  return e.updatedAt ?? (e.date ? `${e.date}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z')
}

function mergeDailyLog(a: Record<string, unknown>[], b: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  const add = (e: Record<string, unknown>) => {
    const date = String(e.date ?? '')
    if (!date) return
    const prev = map.get(date)
    if (!prev || entryStamp(e as { updatedAt?: string; date?: string }) >= entryStamp(prev as { updatedAt?: string; date?: string })) {
      map.set(date, e)
    }
  }
  for (const e of a) add(e)
  for (const e of b) add(e)
  return [...map.values()].sort((x, y) => String(x.date).localeCompare(String(y.date)))
}

function mergeById(
  a: Record<string, unknown>[],
  b: Record<string, unknown>[],
  idKey: string,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  const add = (e: Record<string, unknown>) => {
    const id = String(e[idKey] ?? '')
    if (!id) return
    const prev = map.get(id)
    if (!prev || entryStamp(e as { updatedAt?: string; date?: string }) >= entryStamp(prev as { updatedAt?: string; date?: string })) {
      map.set(id, e)
    }
  }
  for (const e of a) add(e)
  for (const e of b) add(e)
  return [...map.values()]
}

function mergeStored(existing: StoredState | null, incoming: StoredState): StoredState {
  if (!existing) return { ...incoming, savedAt: new Date().toISOString() }
  const dailyLog = mergeDailyLog(
    (existing.dailyLog ?? []) as Record<string, unknown>[],
    (incoming.dailyLog ?? []) as Record<string, unknown>[],
  )
  const readingBooks = mergeById(
    (existing.readingBooks ?? []) as Record<string, unknown>[],
    (incoming.readingBooks ?? []) as Record<string, unknown>[],
    'id',
  )
  const weightLog = mergeById(
    (existing.weightLog ?? []) as Record<string, unknown>[],
    (incoming.weightLog ?? []) as Record<string, unknown>[],
    'date',
  )
  return { dailyLog, readingBooks, weightLog, savedAt: new Date().toISOString() }
}

async function readKv(): Promise<StoredState | null> {
  if (!process.env.KV_REST_API_URL) return null
  const { kv } = await import('@vercel/kv')
  return (await kv.get<StoredState>(KV_KEY)) ?? null
}

async function writeKv(body: StoredState): Promise<boolean> {
  if (!process.env.KV_REST_API_URL) return false
  const { kv } = await import('@vercel/kv')
  await kv.set(KV_KEY, body)
  return true
}

async function readBlob(): Promise<StoredState | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  const { list } = await import('@vercel/blob')
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 })
  if (blobs.length === 0) return null
  const res = await fetch(blobs[0].url)
  if (!res.ok) return null
  return (await res.json()) as StoredState
}

async function writeBlob(body: StoredState): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false
  const { put } = await import('@vercel/blob')
  await put(BLOB_PATH, JSON.stringify(body), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return true
}

async function readState(): Promise<{ state: StoredState | null; storage: string }> {
  const kv = await readKv()
  if (kv) return { state: kv, storage: 'kv' }
  const blob = await readBlob()
  if (blob) return { state: blob, storage: 'blob' }
  return { state: null, storage: 'none' }
}

async function writeState(body: StoredState): Promise<{ ok: boolean; storage: string }> {
  if (await writeKv(body)) return { ok: true, storage: 'kv' }
  if (await writeBlob(body)) return { ok: true, storage: 'blob' }
  return { ok: false, storage: 'none' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { state, storage } = await readState()
      if (!state) {
        return res.status(200).json({
          dailyLog: [],
          readingBooks: [],
          weightLog: [],
          savedAt: null,
          storage,
        })
      }
      return res.status(200).json({
        dailyLog: state.dailyLog ?? [],
        readingBooks: state.readingBooks ?? [],
        weightLog: state.weightLog ?? [],
        savedAt: state.savedAt ?? null,
        storage,
      })
    } catch (err) {
      console.error('GET /api/state', err)
      return res.status(503).json({ error: 'Storage unavailable' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body as StoredState
      if (!body || !Array.isArray(body.dailyLog)) {
        return res.status(400).json({ error: 'Invalid body' })
      }
      const { state: existing } = await readState()
      const merged = mergeStored(existing, {
        dailyLog: body.dailyLog,
        readingBooks: Array.isArray(body.readingBooks) ? body.readingBooks : [],
        weightLog: Array.isArray(body.weightLog) ? body.weightLog : [],
      })
      const { ok, storage } = await writeState(merged)
      if (!ok) {
        return res.status(503).json({
          error: 'Storage not configured — link Redis or Blob in Vercel → Storage',
        })
      }
      return res.status(200).json({ ok: true, savedAt: merged.savedAt, storage })
    } catch (err) {
      console.error('PUT /api/state', err)
      return res.status(500).json({ error: 'Save failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
