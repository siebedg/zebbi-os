import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pin = process.env.ZEEBI_PIN ?? process.env.ZEEBI_SYNC_TOKEN
  if (!pin) {
    return res.status(200).json({ ok: true, required: false })
  }

  const body = req.body as { pin?: string }
  if (!body?.pin) {
    return res.status(200).json({ ok: false, required: true })
  }

  if (body.pin === pin) {
    return res.status(200).json({ ok: true, required: true })
  }

  return res.status(401).json({ ok: false, error: 'Onjuiste PIN', required: true })
}
