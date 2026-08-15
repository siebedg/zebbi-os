import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowRight, Check, Play, SquareTerminal } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, SHUTDOWN_QR_PAYLOAD } from '../lib/shutdown'
import {
  loadShutdownSession,
  saveShutdownSession,
  sessionSecondsLeft,
} from '../lib/shutdownSession'
import { launchKillHelper } from '../lib/shutdownKill'
import { Btn, Card, PageHeader } from './ui'
import { HabitContractsImage } from './HabitContractsImage'

function SunMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="h-[1em] w-[1em] shrink-0" aria-hidden>
      <circle cx="16" cy="16" r="5.25" fill={color} />
      <g stroke={color} strokeWidth="2.15" strokeLinecap="round" fill="none">
        <path d="M16 3.2v3.1M16 25.7v3.1M6.2 6.2l2.2 2.2M23.6 23.6l2.2 2.2M3.2 16h3.1M25.7 16h3.1M6.2 25.8l2.2-2.2M23.6 8.4l2.2-2.2" />
      </g>
    </svg>
  )
}

function ShutdownItemLabel({ text }: { text: string }) {
  const lower = text.toLowerCase()

  if (lower.includes('supplement')) {
    return (
      <>
        Take your supplements{' '}
        <span className="font-semibold underline underline-offset-2">NOW</span> before you continue
      </>
    )
  }

  if (lower.includes('plan tomorrow')) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        Plan tomorrow
        <SunMark color="#facc15" />
        <span className="font-medium text-[var(--color-muted)]">{'&'}</span>
        <SunMark color="#fb923c" />
      </span>
    )
  }

  if (lower.includes('yoga')) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        Take yoga mat
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" strokeWidth={2.25} />
        now do some yoga with Bend 😊
        <span className="text-[var(--color-muted)]">—</span>
        op het einde & 🎾
      </span>
    )
  }

  if (lower.includes('intention')) {
    return (
      <>
        <span className="italic underline decoration-2 underline-offset-2 text-[var(--color-bad)]">
          Intention
        </span>
        {' + Timetable / Google Calendar'}
      </>
    )
  }

  return <>{text}</>
}

function isSupplementItem(text: string) {
  return text.toLowerCase().includes('supplement')
}

function supplementKey(template: ShutdownTemplate): string | null {
  for (const section of template.sections) {
    const idx = section.items.findIndex(isSupplementItem)
    if (idx >= 0) return `${section.id}-${idx}`
  }
  return null
}

function CheckRow({
  done,
  onToggle,
  text,
}: {
  done: boolean
  onToggle: () => void
  text: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
        done
          ? 'border-[var(--color-border)] bg-[var(--color-surface-overlay)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          done
            ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
            : 'border-[var(--color-border)] text-transparent'
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span className={done ? 'text-[var(--color-muted)] line-through' : 'text-[var(--color-text)]'}>
        <ShutdownItemLabel text={text} />
      </span>
    </button>
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
  const [killDone, setKillDone] = useState(existing?.killDone ?? false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    existing ? sessionSecondsLeft(existing) : (template?.timerMinutes ?? 0) * 60,
  )
  const [checked, setChecked] = useState<Set<string>>(() => new Set(existing?.checked ?? []))
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    const session = loadShutdownSession()
    if (session) {
      setStartedAt(session.startedAt)
      setTimerMinutes(session.timerMinutes)
      setKillDone(session.killDone)
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
      killDone,
      checked: [...checked],
    })
  }, [template, startedAt, timerMinutes, killDone, checked])

  useEffect(() => {
    void QRCode.toDataURL(SHUTDOWN_QR_PAYLOAD, {
      width: 240,
      margin: 1,
      color: { dark: '#111111', light: '#f8f6f2' },
    }).then(setQrDataUrl)
  }, [])

  if (!template) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--color-muted)]">
        Geen shutdown template.
      </div>
    )
  }

  const startFlow = () => {
    const now = Date.now()
    setStartedAt(now)
    setTimerMinutes(template.timerMinutes)
    setSecondsLeft(template.timerMinutes * 60)
    setKillDone(false)
    setChecked(new Set())
    saveShutdownSession({
      startedAt: now,
      timerMinutes: template.timerMinutes,
      templateId: template.id,
      killDone: false,
      checked: [],
    })
  }

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const gateKey = supplementKey(template)
  const restUnlocked = !gateKey || checked.has(gateKey)

  if (!startedAt) {
    return (
      <div className="osc-fade-up mx-auto flex max-w-lg flex-col items-center pb-16 pt-8 text-center">
        <PageHeader className="mb-10" title="Daily shutdown" />
        <Btn onClick={startFlow} className="px-8 py-3 text-base">
          <Play className="h-4 w-4" />
          Start Daily Shutdown
        </Btn>
        <p className="mt-4 text-xs text-[var(--color-muted)]">{template.timerMinutes} min</p>
      </div>
    )
  }

  return (
    <div className="osc-fade-up mx-auto max-w-lg space-y-6 pb-12">
      <div className="text-center">
        <h1 className="font-display text-[2.15rem] font-medium tracking-tight text-[var(--color-text)] sm:text-4xl">
          Daily shutdown
        </h1>
        <p className="mt-3 font-display text-6xl font-medium tabular-nums tracking-tight text-[var(--color-text)]">
          {formatMmSs(secondsLeft)}
        </p>
      </div>

      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Kill noise
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            onClick={() => {
              saveShutdownSession({
                startedAt,
                timerMinutes,
                templateId: template.id,
                killDone,
                checked: [...checked],
              })
              launchKillHelper()
            }}
          >
            <SquareTerminal className="h-4 w-4" />
            Kill distractions
          </Btn>
          <Btn variant={killDone ? 'primary' : 'ghost'} onClick={() => setKillDone((v) => !v)}>
            {killDone ? 'Kill done' : 'Mark kill done'}
          </Btn>
        </div>
      </Card>

      {(template.imageDataUrl || template.imageName) && (
        <div className="space-y-3">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Habit Contracts
          </p>
          <HabitContractsImage imageDataUrl={template.imageDataUrl} imageName={template.imageName} />
        </div>
      )}

      {killDone && (
        <Card className="p-5 text-center">
          {qrDataUrl ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Scan
              </p>
              <img
                src={qrDataUrl}
                alt="Shutdown QR"
                className="mx-auto mt-4 h-44 w-44 rounded-2xl border border-[var(--color-border)] bg-white p-2"
              />
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">QR wordt opgebouwd…</p>
          )}
        </Card>
      )}

      <div className="space-y-6">
        {template.sections.map((section) =>
          section.items.map((item, idx) => {
            if (!isSupplementItem(item)) return null
            const key = `${section.id}-${idx}`
            return <CheckRow key={key} done={checked.has(key)} onToggle={() => toggleItem(key)} text={item} />
          }),
        )}

        {restUnlocked &&
          template.sections.map((section) => {
            const items = section.items
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => !isSupplementItem(item))
            if (items.length === 0) return null
            return (
              <div key={section.id} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {section.title}
                </p>
                {items.map(({ item, idx }) => {
                  const key = `${section.id}-${idx}`
                  return (
                    <CheckRow
                      key={key}
                      done={checked.has(key)}
                      onToggle={() => toggleItem(key)}
                      text={item}
                    />
                  )
                })}
              </div>
            )
          })}
      </div>
    </div>
  )
}
