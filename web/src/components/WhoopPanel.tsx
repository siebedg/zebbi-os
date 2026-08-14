import { useCallback, useEffect, useState } from 'react'
import {
  disconnectWhoop,
  fetchWhoopStatus,
  startWhoopConnect,
  syncWhoop,
  type WhoopStatus,
} from '../lib/whoopClient'
import { useStore } from '../hooks/useStore'
import { Toggle } from './ui'

export function WhoopPanel() {
  const { refreshFromCloud } = useStore()
  const [status, setStatus] = useState<WhoopStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const s = await fetchWhoopStatus()
      setStatus(s)
    } catch {
      setStatus({
        configured: false,
        connected: false,
        connectedAt: null,
        syncFrom: '2026-07-04',
      })
      setMsg('Whoop status kon niet geladen worden.')
    }
  }, [])

  useEffect(() => {
    void reload()
    const params = new URLSearchParams(window.location.search)
    const whoop = params.get('whoop')
    if (whoop === 'connected') {
      setMsg('Whoop verbonden. Sync loopt automatisch.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (whoop === 'error') {
      setMsg(`Whoop fout: ${params.get('msg') ?? 'onbekend'}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [reload])

  const onConnect = async () => {
    setBusy(true)
    setMsg(null)
    const r = await startWhoopConnect()
    if (!r.ok) {
      setMsg(r.error ?? 'Connect mislukt')
      setBusy(false)
    }
  }

  const onDisconnect = async () => {
    setBusy(true)
    const r = await disconnectWhoop()
    setMsg(r.ok ? 'Whoop uit.' : r.error ?? 'Mislukt')
    await reload()
    setBusy(false)
  }

  const onToggle = async (on: boolean) => {
    if (!status?.configured || busy) return
    if (on) await onConnect()
    else await onDisconnect()
  }

  const onSync = async () => {
    setBusy(true)
    setMsg(null)
    const r = await syncWhoop()
    if (!r.ok) {
      setMsg(r.error ?? 'Sync mislukt')
      await reload()
    } else {
      await refreshFromCloud()
      setMsg(`Synced: ${r.sleepsFetched ?? 0} sleeps → ${r.daysUpdated ?? 0} dagen.`)
      await reload()
    }
    setBusy(false)
  }

  if (!status) {
    return <p className="text-sm text-[var(--color-muted)]">Whoop laden…</p>
  }

  const on = Boolean(status.connected) && !status.expired

  return (
    <div>
      <Toggle label="Whoop" checked={on} onChange={(v) => void onToggle(v)} />
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
        {status.configured
          ? 'Sleep score, wake en bed vanaf Whoop. Zet aan om te verbinden.'
          : 'Nog niet geconfigureerd (WHOOP_CLIENT_ID/SECRET in Vercel).'}
      </p>
      {on && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Verbonden
          {status.connectedAt ? ` · ${new Date(status.connectedAt).toLocaleString('nl-BE')}` : ''}.
          {' '}
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={busy}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            Sync nu
          </button>
        </p>
      )}
      {status.connected && status.expired && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Login verlopen. Zet Whoop aan om opnieuw te verbinden.
        </p>
      )}
      {msg && <p className="mt-2 text-xs text-[var(--color-muted)]">{msg}</p>}
    </div>
  )
}
