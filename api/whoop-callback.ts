import type { VercelRequest, VercelResponse } from '@vercel/node'
import { exchangeCode, saveTokens, whoopConfigured, whoopRedirectUri } from '../lib/whoop'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed')
  if (!whoopConfigured()) return res.status(503).send('Whoop not configured')

  const error = typeof req.query.error === 'string' ? req.query.error : null
  if (error) {
    return res.redirect(302, `/?whoop=error&msg=${encodeURIComponent(error)}`)
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null
  if (!code) return res.redirect(302, '/?whoop=error&msg=missing_code')

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
