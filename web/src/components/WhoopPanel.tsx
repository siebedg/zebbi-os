import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Unplug, Watch } from 'lucide-react'
import {
  disconnectWhoop,
  fetchWhoopStatus,
  startWhoopConnect,
  syncWhoop,
  type WhoopStatus,
} from '../lib/whoopClient'
import { useStore } from '../hooks/useStore'
import { Btn, Card } from './ui'

export function WhoopPanel() {
  const { refreshFromCloud } = useStore()
  const [status, setStatus] = useState<WhoopStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const s = await fetchWhoopStatus()
    setStatus(s)
  }, [])

  useEffect(() => {
    void reload()
    const params = new URLSearchParams(window.location.search)
    const whoop = params.get('whoop')
    if (whoop === 'connected') {
      setMsg('Whoop verbonden — klik Sync om slaap vanaf 4 jul te laden.')
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

  const onSync = async () => {
    setBusy(true)
    setMsg(null)
    const r = await syncWhoop()
    if (!r.ok) {
      setMsg(r.error ?? 'Sync mislukt')
    } else {
      await refreshFromCloud()
      setMsg(
        `Synced: ${r.sleepsFetched ?? 0} sleeps → ${r.daysUpdated ?? 0} dagen (vanaf ${r.syncFrom}).`,
      )
      await reload()
    }
    setBusy(false)
  }

  const onDisconnect = async () => {
    if (!confirm('Whoop ontkoppelen?')) return
    setBusy(true)
    const r = await disconnectWhoop()
    setMsg(r.ok ? 'Whoop ontkoppeld.' : r.error ?? 'Mislukt')
    await reload()
    setBusy(false)
  }

  if (!status) return null

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Watch className="h-4 w-4 text-[var(--color-muted)]" />
            <h3 className="text-sm font-medium text-[var(--color-text)]">Whoop</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Wake, bed &amp; sleep score vanaf {status.syncFrom}. Eerdere dagen blijven met de hand
            ingevuld.
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {status.connected
              ? `Verbonden${status.connectedAt ? ` · ${new Date(status.connectedAt).toLocaleString('nl-BE')}` : ''}`
              : status.configured
                ? 'Niet verbonden'
                : 'Nog niet geconfigureerd (WHOOP_CLIENT_ID/SECRET in Vercel)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!status.connected && status.configured && (
            <Btn type="button" onClick={onConnect} disabled={busy} className="!py-2 !text-xs">
              Connect Whoop
            </Btn>
          )}
          {status.connected && (
            <>
              <Btn type="button" onClick={onSync} disabled={busy} className="!py-2 !text-xs">
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                Sync
              </Btn>
              <Btn type="button" variant="ghost" onClick={onDisconnect} disabled={busy} className="!py-2 !text-xs">
                <Unplug className="h-3.5 w-3.5" />
                Ontkoppel
              </Btn>
            </>
          )}
        </div>
      </div>
      {msg && <p className="mt-3 text-xs text-[var(--color-muted)]">{msg}</p>}
    </Card>
  )
}
