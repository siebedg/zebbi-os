import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  consumeOAuthState,
  exchangeCode,
  saveTokens,
  whoopConfigured,
  whoopRedirectUri,
} from '../lib/whoop'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')
  if (!whoopConfigured()) return res.status(503).send('Whoop not configured')

  const q = req.query
  const error = typeof q.error === 'string' ? q.error : null
  const errorDesc = typeof q.error_description === 'string' ? q.error_description : ''
  if (error) {
    const msg = errorDesc ? `${error}: ${errorDesc}` : error
    const hint =
      error === 'invalid_state' || error === 'access_denied'
        ? ' — check Redirect URI in Whoop dashboard = https://zebbi-os.vercel.app/api/whoop-callback (geen slash op het einde)'
        : ''
    return res.redirect(302, `/?whoop=error&msg=${encodeURIComponent(msg + hint)}`)
  }

  const code = typeof q.code === 'string' ? q.code : null
  const state = typeof q.state === 'string' ? q.state : null
  if (!code) return res.redirect(302, '/?whoop=error&msg=missing_code')

  const stateOk = await consumeOAuthState(state)
  if (!stateOk) {
    return res.redirect(
      302,
      `/?whoop=error&msg=${encodeURIComponent('OAuth state ongeldig of verlopen — probeer Connect opnieuw')}`,
    )
  }

  try {
    const host = req.headers.host || 'zebbi-os.vercel.app'
    const redirectUri = whoopRedirectUri(host)
    const tokens = await exchangeCode(code, redirectUri)
    await saveTokens(tokens)
    return res.redirect(302, '/?whoop=connected')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'callback_failed'
    return res.redirect(302, `/?whoop=error&msg=${encodeURIComponent(msg)}`)
  }
}
