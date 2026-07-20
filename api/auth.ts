import type { VercelRequest, VercelResponse } from '@vercel/node'
import { acceptedAccessTokens } from '../lib/access'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { pin?: string }
  if (!body?.pin) {
    // Gate is client-side pattern now; API still expects a bearer token for data.
    return res.status(200).json({ ok: false, required: true })
  }

  if (acceptedAccessTokens().includes(body.pin)) {
    return res.status(200).json({ ok: true, required: true })
  }

  return res.status(401).json({ ok: false, error: 'Onjuiste toegangscode', required: true })
}
