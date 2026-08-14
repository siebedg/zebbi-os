import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { formatMmSs } from '../lib/shutdown'
import {
  clearShutdownSession,
  loadShutdownSession,
  sessionSecondsLeft,
  subscribeShutdownSession,
  type ShutdownSession,
} from '../lib/shutdownSession'

export function ShutdownTimerDock() {
  const location = useLocation()
  const [session, setSession] = useState<ShutdownSession | null>(() => loadShutdownSession())
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const s = loadShutdownSession()
    return s ? sessionSecondsLeft(s) : 0
  })

  useEffect(() => subscribeShutdownSession(() => setSession(loadShutdownSession())), [])

  useEffect(() => {
    if (!session) return
    const tick = () => setSecondsLeft(sessionSecondsLeft(session))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [session])

  if (!session || location.pathname === '/shutdown') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1">
      <Link
        to="/shutdown"
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 font-display text-sm tabular-nums tracking-tight text-[var(--color-text)] shadow-[var(--shadow-card)]"
      >
        {formatMmSs(secondsLeft)}
      </Link>
      <button
        type="button"
        onClick={() => {
          clearShutdownSession()
          setSession(null)
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
        aria-label="Stop shutdown timer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
