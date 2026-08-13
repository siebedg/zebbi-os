import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Play, SquareTerminal } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, makeShutdownQrPayload } from '../lib/shutdown'
import { uid } from '../lib/utils'
import { Btn, Card, PageHeader } from './ui'

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

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [killDone, setKillDone] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

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

  const copyKillCommand = async () => {
    const text = template.killCommand?.trim()
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!startedAt) {
    return (
      <div className="osc-fade-up mx-auto flex max-w-lg flex-col items-center pb-16 pt-8 text-center">
        <PageHeader
          className="mb-10"
          eyebrow="Shutdown"
          title={
            <>
              Close the <span className="italic">day</span>
            </>
          }
          sub={template.introMessage}
        />
        <Btn onClick={startFlow} className="px-8 py-3 text-base">
          <Play className="h-4 w-4" />
          Start Daily Shutdown
        </Btn>
        <p className="mt-4 text-xs text-[var(--color-muted)]">{template.timerMinutes} min</p>
      </div>
    )
  }

  const killCommand =
    template.killCommand || 'powershell -ExecutionPolicy Bypass -File ".\\tools\\zebbi-shutdown-kill.ps1"'

  return (
    <div className="osc-fade-up mx-auto max-w-lg space-y-6 pb-12">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Daily shutdown
        </p>
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

      <Card className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Kill noise
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Run this locally — the browser can’t close your apps.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--color-surface-overlay)] p-3 text-left text-[11px] leading-relaxed text-[var(--color-text)]">
          {killCommand}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={copyKillCommand}>
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy command'}
          </Btn>
          <Btn variant={killDone ? 'primary' : 'ghost'} onClick={() => setKillDone((v) => !v)}>
            <SquareTerminal className="h-4 w-4" />
            {killDone ? 'Kill done' : 'Mark kill done'}
          </Btn>
        </div>
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
        {template.imageDataUrl && (
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <img
              src={template.imageDataUrl}
              alt={template.imageName || 'Habit contracts'}
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}

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
                    {item}
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
