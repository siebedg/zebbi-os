import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowRight, Check, ImagePlus, Play, SquareTerminal } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, SHUTDOWN_QR_PAYLOAD, normalizeShutdownTemplate } from '../lib/shutdown'
import {
  loadShutdownSession,
  saveShutdownSession,
  sessionSecondsLeft,
} from '../lib/shutdownSession'
import { launchKillHelper } from '../lib/shutdownKill'
import { Btn, Card, PageHeader } from './ui'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<{ dataUrl: string; name: string }> {
  const raw = await fileToDataUrl(file)
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return { dataUrl: raw, name: file.name }
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image load failed'))
    el.src = raw
  })
  const max = 1200
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: raw, name: file.name }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.82), name: file.name }
}

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <circle cx="12" cy="12" r="3.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M12 2.6v2.1M12 19.3v2.1M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5" />
      </g>
    </svg>
  )
}

function SunChip({ tone }: { tone: 'yellow' | 'orange' }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-stone-900"
      style={{ background: tone === 'yellow' ? '#facc15' : '#fb923c' }}
      aria-hidden
    >
      <SunGlyph />
    </span>
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
      <span className="inline-flex flex-wrap items-center gap-1.5">
        Plan tomorrow
        <SunChip tone="yellow" />
        <span className="font-medium text-[var(--color-muted)]">{'&'}</span>
        <SunChip tone="orange" />
      </span>
    )
  }

  if (lower.includes('yoga')) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        Take yoga mat
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" strokeWidth={2.25} />
        now do some yoga with Bend 😊
      </span>
    )
  }

  if (lower.includes('intention')) {
    return (
      <>
        <span className="italic underline decoration-2 underline-offset-2 text-[var(--color-bad)]">
          intention
        </span>
        {' + Timetable / Google Calendar'}
      </>
    )
  }

  return <>{text}</>
}

function HabitContracts({
  imageDataUrl,
  imageName,
  onUpload,
}: {
  imageDataUrl?: string
  imageName?: string
  onUpload: (file: File) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        Habit Contracts
      </p>
      {imageDataUrl ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <img src={imageDataUrl} alt={imageName || 'Habit contracts'} className="max-h-80 w-full object-contain bg-[var(--color-surface)]" />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          Nog geen foto
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]">
        <ImagePlus className="h-3.5 w-3.5" />
        {imageDataUrl ? 'Vervang foto' : 'Upload foto'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

export function ShutdownView({
  templates,
  activeTemplateId,
  onSaveTemplate,
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
  const [secondsLeft, setSecondsLeft] = useState(() => (existing ? sessionSecondsLeft(existing) : (template?.timerMinutes ?? 0) * 60))
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

  const uploadContract = async (file: File) => {
    const { dataUrl, name } = await compressImage(file)
    onSaveTemplate(
      normalizeShutdownTemplate({
        ...template,
        imageDataUrl: dataUrl,
        imageName: name,
        updatedAt: new Date().toISOString(),
      }),
    )
  }

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

  const killCard = (
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
  )

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

      {killCard}

      <HabitContracts
        imageDataUrl={template.imageDataUrl}
        imageName={template.imageName}
        onUpload={uploadContract}
      />

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
        {template.sections.map((section) => (
          <div key={section.id} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {section.title}
            </p>
            {section.items.map((item, idx) => {
              const key = `${section.id}-${idx}`
              const done = checked.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleItem(key)}
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
                    <ShutdownItemLabel text={item} />
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
