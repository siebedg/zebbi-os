import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authorized, loadTokens, whoopConfigured, whoopRedirectUri, WHOOP_SYNC_FROM } from '../lib/whoop'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const configured = whoopConfigured()
  const tokens = configured ? await loadTokens() : null

  return res.status(200).json({
    configured,
    connected: Boolean(tokens?.access_token),
    connectedAt: tokens?.connected_at ?? null,
    syncFrom: WHOOP_SYNC_FROM,
    redirectUri: whoopRedirectUri(),
  })
}
