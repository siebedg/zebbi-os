import { useEffect, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { ArrowRight, Check, ImagePlus, Play, SquareTerminal } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, makeShutdownQrPayload, normalizeShutdownTemplate } from '../lib/shutdown'
import { KILL_INSTALLER_PATH, launchKillHelper } from '../lib/shutdownKill'
import { uid } from '../lib/utils'
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

function SunChip({ tone }: { tone: 'yellow' | 'orange' }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px] leading-none"
      style={{ background: tone === 'yellow' ? '#facc15' : '#fb923c' }}
      aria-hidden
    >
      ☀️
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

function IntroCopy({ text }: { text: string }) {
  const liefs = text.match(/^(.*?)(?:\s*[\n.]\s*)?(Liefs,?\s*Siebe\.?)\s*$/is)
  if (liefs) {
    let body = liefs[1].trim()
    if (body && !/[.!?]$/.test(body)) body += '.'
    return (
      <>
        <p>{body || 'Als je alle stappen doorneemt voel je je altijd fulfilled en oprecht euphoric.'}</p>
        <p className="mt-2">{liefs[2].replace(/\.$/, '')}</p>
      </>
    )
  }
  return <p>{text}</p>
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

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [killDone, setKillDone] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    setStartedAt(null)
    setKillDone(false)
    setSecondsLeft((template?.timerMinutes ?? 0) * 60)
    setChecked(new Set())
    setQrDataUrl('')
  }, [template])

  useEffect(() => {
    if (!template || !startedAt) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, template.timerMinutes * 60 - Math.floor((Date.now() - startedAt) / 1000))
      setSecondsLeft(next)
    }, 250)
    return () => window.clearInterval(timer)
  }, [template, startedAt])

  useEffect(() => {
    if (!template || !startedAt || !killDone) {
      setQrDataUrl('')
      return
    }
    const payload = makeShutdownQrPayload(template, startedAt, uid())
    void QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: '#111111', light: '#f8f6f2' },
    }).then(setQrDataUrl)
  }, [template, startedAt, killDone])

  if (!template) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--color-muted)]">
        Geen shutdown template.
      </div>
    )
  }

  const startFlow = () => {
    setStartedAt(Date.now())
    setSecondsLeft(template.timerMinutes * 60)
    setKillDone(false)
    setChecked(new Set())
  }

  const endFlow = () => {
    setStartedAt(null)
    setKillDone(false)
    setSecondsLeft(template.timerMinutes * 60)
    setChecked(new Set())
    setQrDataUrl('')
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

  const intro: ReactNode = <IntroCopy text={template.introMessage} />

  if (!startedAt) {
    return (
      <div className="osc-fade-up mx-auto flex max-w-lg flex-col items-center pb-16 pt-8 text-center">
        <PageHeader className="mb-10" title="Daily shutdown" sub={intro} />
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
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {secondsLeft > 0 ? template.encouragement : 'Time. Scan when kill is done.'}
        </p>
        <button
          type="button"
          onClick={endFlow}
          className="mt-3 text-xs text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          End
        </button>
      </div>

      <HabitContracts
        imageDataUrl={template.imageDataUrl}
        imageName={template.imageName}
        onUpload={uploadContract}
      />

      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Kill noise
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Eén klik sluit Discord, Slack, Spotify, enz. Chrome vraagt de eerste keer of Zebbi mag openen
          — daarna is het alleen die knop.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={launchKillHelper}>
            <SquareTerminal className="h-4 w-4" />
            Kill distractions
          </Btn>
          <Btn variant={killDone ? 'primary' : 'ghost'} onClick={() => setKillDone((v) => !v)}>
            {killDone ? 'Kill done' : 'Mark kill done'}
          </Btn>
        </div>
        <a
          href={KILL_INSTALLER_PATH}
          download="Zebbi-install-kill.bat"
          className="mt-3 inline-block text-xs text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          Eerste keer op deze PC? Installeer one-click
        </a>
      </Card>

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
