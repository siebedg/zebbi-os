import type { VercelRequest, VercelResponse } from '@vercel/node'

const KEY = 'zebbi-os:state'

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
  const raw = await kv.get<StoredState>(KEY)
  return raw ?? null
}

async function writeKv(body: StoredState): Promise<boolean> {
  if (!process.env.KV_REST_API_URL) return false
  const { kv } = await import('@vercel/kv')
  await kv.set(KEY, { ...body, savedAt: new Date().toISOString() })
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const state = await readKv()
      if (!state) {
        return res.status(200).json({ dailyLog: [], savedAt: null, storage: 'none' })
      }
      return res.status(200).json({ ...state, storage: 'kv' })
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
      const ok = await writeKv(body)
      if (!ok) {
        return res.status(503).json({ error: 'KV not configured' })
      }
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() })
    } catch (err) {
      console.error('PUT /api/state', err)
      return res.status(500).json({ error: 'Save failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
