import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { PartyPopper, Play, RotateCcw, Shuffle, Smartphone, Undo2, X } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, SHUTDOWN_QR_PAYLOAD } from '../lib/shutdown'
import {
  clearShutdownSession,
  loadShutdownSession,
  saveShutdownSession,
  sessionSecondsLeft,
} from '../lib/shutdownSession'
import {
  SHUTDOWN_STYLES,
  buildShutdownSteps,
  dayAccent,
  dayNumber,
  shuffleStyle,
  todayStyleIndex,
} from '../lib/shutdownStyle'
import { SHUTDOWN_GAMES } from './shutdown/ShutdownGames'

function barButton(active = false) {
  return `inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
    active
      ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]'
  }`
}

function PhoneQr({ onClose }: { onClose: () => void }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    void QRCode.toDataURL(SHUTDOWN_QR_PAYLOAD, {
      width: 240,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    }).then(setSrc)
  }, [])
  return (
    <div className="sd-enter absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]">
      {src ? (
        <img src={src} alt="QR naar shutdown op je telefoon" className="mx-auto h-40 w-40 rounded-lg" />
      ) : (
        <p className="py-16 text-xs text-[var(--color-muted)]">QR laden…</p>
      )}
      <p className="mt-2 text-xs text-[var(--color-muted)]">Scan om verder te doen op je telefoon</p>
      <button type="button" onClick={onClose} className="mt-2 text-xs font-medium text-[var(--color-text)] hover:underline">
        Sluiten
      </button>
    </div>
  )
}

export function ShutdownView({
  templates,
  activeTemplateId,
}: {
  templates: ShutdownTemplate[]
  activeTemplateId?: string
  onSaveTemplate: (template: ShutdownTemplate) => void
  onDeleteTemplate: (id: string) => void
  onSetActiveTemplate: (id: string) => void
}) {
  const template =
    templates.find((t) => t.id === activeTemplateId) ??
    templates.find((t) => /daily/i.test(t.name)) ??
    templates[0] ??
    null

  const existing = loadShutdownSession()
  const [startedAt, setStartedAt] = useState<number | null>(existing?.startedAt ?? null)
  const [timerMinutes, setTimerMinutes] = useState(existing?.timerMinutes ?? template?.timerMinutes ?? 15)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    existing ? sessionSecondsLeft(existing) : (template?.timerMinutes ?? 0) * 60,
  )
  const [checked, setChecked] = useState<Set<string>>(() => new Set(existing?.checked ?? []))
  const [qrOpen, setQrOpen] = useState(false)

  const day = dayNumber()
  const accent = dayAccent(day)
  const [styleIndex, setStyleIndex] = useState(() => todayStyleIndex(day))
  const style = SHUTDOWN_STYLES[styleIndex]
  const Game = SHUTDOWN_GAMES[style.id]

  const steps = useMemo(() => (template ? buildShutdownSteps(template) : []), [template])
  const currentIndex = steps.findIndex((s) => !checked.has(s.key))
  const allDone = steps.length > 0 && currentIndex === -1

  useEffect(() => {
    const session = loadShutdownSession()
    if (session) {
      setStartedAt(session.startedAt)
      setTimerMinutes(session.timerMinutes)
      setChecked(new Set(session.checked))
      setSecondsLeft(sessionSecondsLeft(session))
      return
    }
    setSecondsLeft((template?.timerMinutes ?? 0) * 60)
  }, [template?.id])

  useEffect(() => {
    if (!startedAt) return
    const tick = () => {
      setSecondsLeft(Math.max(0, timerMinutes * 60 - Math.floor((Date.now() - startedAt) / 1000)))
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [startedAt, timerMinutes])

  useEffect(() => {
    if (!template || !startedAt) return
    saveShutdownSession({
      startedAt,
      timerMinutes,
      templateId: template.id,
      killDone: false,
      checked: [...checked],
    })
  }, [template, startedAt, timerMinutes, checked])


  if (!template) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--color-muted)]">
        Geen shutdown routine. Maak er een aan in Settings.
      </div>
    )
  }

  const startFlow = () => {
    const now = Date.now()
    setStartedAt(now)
    setTimerMinutes(template.timerMinutes)
    setSecondsLeft(template.timerMinutes * 60)
    setChecked(new Set())
  }

  /** Restart the countdown; progress on the steps stays. */
  const resetTimer = () => {
    setStartedAt(Date.now())
    setTimerMinutes(template.timerMinutes)
    setSecondsLeft(template.timerMinutes * 60)
  }

  const stopFlow = () => {
    clearShutdownSession()
    setStartedAt(null)
    setChecked(new Set())
    setQrOpen(false)
  }

  const completeCurrent = () => {
    const step = steps[currentIndex]
    if (!step) return
    setChecked((prev) => new Set(prev).add(step.key))
  }

  const undoLast = () => {
    const last = [...steps].reverse().find((s) => checked.has(s.key))
    if (!last) return
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(last.key)
      return next
    })
  }

  const reroll = () => setStyleIndex((i) => shuffleStyle(i, day))

  if (!startedAt) {
    return (
      <div className="osc-fade-up mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center pb-16 text-center">
        <span
          className="inline-flex h-12 items-center rounded-full px-4 text-xs font-semibold"
          style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
        >
          Vandaag: {style.name}
        </span>
        <h1 className="mt-6 font-display text-[2.6rem] font-medium leading-none tracking-tight text-[var(--color-text)] sm:text-6xl">
          Daily shutdown
        </h1>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          {style.hint}. {steps.length} stappen, {template.timerMinutes} minuten.
        </p>
        <button
          type="button"
          onClick={startFlow}
          className="mt-10 inline-flex h-14 items-center gap-2.5 rounded-full px-9 text-base font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: accent, boxShadow: `0 14px 40px -12px ${accent}` }}
        >
          <Play className="h-5 w-5" fill="currentColor" />
          Start shutdown
        </button>
        <button type="button" onClick={reroll} className={`mt-4 ${barButton()}`}>
          <Shuffle className="h-3.5 w-3.5" />
          Andere stijl
        </button>
      </div>
    )
  }

  const timeUp = secondsLeft === 0
  const doneCount = steps.filter((s) => checked.has(s.key)).length

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {/* Control bar: timer with reset, style shuffle, undo, phone, stop */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+7.5rem)] z-20 mb-8 md:top-4">
        <div className="relative flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-md">
          <div
            className={`flex h-9 items-center gap-2 rounded-full px-3.5 font-display text-lg font-medium tabular-nums ${
              timeUp ? 'text-[var(--color-bad)]' : 'text-[var(--color-text)]'
            }`}
            role="timer"
          >
            <span
              className={`h-2 w-2 rounded-full ${timeUp ? '' : 'animate-pulse'}`}
              style={{ background: timeUp ? 'var(--color-bad)' : accent }}
            />
            {formatMmSs(secondsLeft)}
          </div>
          <button type="button" onClick={resetTimer} className={barButton()} title="Timer opnieuw starten">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset timer</span>
          </button>

          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

          <span className="hidden text-xs tabular-nums text-[var(--color-muted)] sm:inline">
            {doneCount}/{steps.length}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            <button type="button" onClick={undoLast} disabled={doneCount === 0} className={`${barButton()} disabled:opacity-30`} title="Stap terug">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={reroll} className={barButton()} title="Andere stijl">
              <Shuffle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{style.name}</span>
            </button>
            <button type="button" onClick={() => setQrOpen((o) => !o)} className={barButton(qrOpen)} title="Verder op telefoon">
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={stopFlow} className={barButton()} title="Shutdown stoppen">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {qrOpen && <PhoneQr onClose={() => setQrOpen(false)} />}
        </div>
        <div className="mx-6 mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${(doneCount / Math.max(1, steps.length)) * 100}%`, background: accent }}
          />
        </div>
      </div>

      {allDone ? (
        <div className="sd-pop flex min-h-[26rem] flex-col items-center justify-center text-center">
          <span
            className="inline-flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
          >
            <PartyPopper className="h-9 w-9" />
          </span>
          <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-[var(--color-text)] sm:text-5xl">
            Dag afgesloten
          </h2>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Alle {steps.length} stappen gedaan. Goed gedaan.
          </p>
          <div className="mt-8 flex gap-2">
            <button type="button" onClick={undoLast} className={barButton()}>
              <Undo2 className="h-3.5 w-3.5" />
              Stap terug
            </button>
            <button type="button" onClick={stopFlow} className={barButton(true)}>
              Afsluiten
            </button>
          </div>
        </div>
      ) : (
        <Game key={style.id} steps={steps} index={currentIndex} accent={accent} day={day} onComplete={completeCurrent} />
      )}
    </div>
  )
}
