import type { VercelRequest, VercelResponse } from '@vercel/node'

const KV_KEY = 'zebbi-os:state'
const BLOB_PATH = 'zebbi-os/state.json'

type StoredState = {
  dailyLog: unknown[]
  savedAt?: string
}

function authorized(req: VercelRequest): boolean {
  const secret = process.env.ZEEBI_SYNC_TOKEN
  if (!secret) return true
  const header = req.headers.authorization
  return header === `Bearer ${secret}`
}

async function readKv(): Promise<StoredState | null> {
  if (!process.env.KV_REST_API_URL) return null
  const { kv } = await import('@vercel/kv')
  return (await kv.get<StoredState>(KV_KEY)) ?? null
}

async function writeKv(body: StoredState): Promise<boolean> {
  if (!process.env.KV_REST_API_URL) return false
  const { kv } = await import('@vercel/kv')
  await kv.set(KV_KEY, { ...body, savedAt: new Date().toISOString() })
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
  await put(BLOB_PATH, JSON.stringify({ ...body, savedAt: new Date().toISOString() }), {
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
        return res.status(200).json({ dailyLog: [], savedAt: null, storage })
      }
      return res.status(200).json({ ...state, storage })
    } catch (err) {
      console.error('GET /api/state', err)
      return res.status(503).json({ error: 'Storage unavailable', dailyLog: [] })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body as StoredState
      if (!body || !Array.isArray(body.dailyLog)) {
        return res.status(400).json({ error: 'Invalid body' })
      }
      const { ok, storage } = await writeState(body)
      if (!ok) {
        return res.status(503).json({
          error: 'Storage not configured — add Redis or Blob in Vercel project Storage',
        })
      }
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString(), storage })
    } catch (err) {
      console.error('PUT /api/state', err)
      return res.status(500).json({ error: 'Save failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
