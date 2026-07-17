import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  WHOOP_AUTH_URL,
  WHOOP_SCOPES,
  authorized,
  createOAuthState,
  whoopClientId,
  whoopConfigured,
  whoopRedirectUri,
} from '../lib/whoop'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (!whoopConfigured()) {
    return res.status(503).json({
      error: 'Whoop niet geconfigureerd — zet WHOOP_CLIENT_ID en WHOOP_CLIENT_SECRET in Vercel',
    })
  }

  const host = req.headers.host || 'zebbi-os.vercel.app'
  const redirectUri = whoopRedirectUri(host)
  const clientId = whoopClientId()
  const state = await createOAuthState()

  const url = new URL(WHOOP_AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', WHOOP_SCOPES)
  url.searchParams.set('state', state)

  return res.status(200).json({ url: url.toString(), redirectUri, state })
}
