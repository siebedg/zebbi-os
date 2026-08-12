import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, ImagePlus, Play, Plus, ScanLine, SquareTerminal, Trash2 } from 'lucide-react'
import type { ShutdownTemplate } from '../types'
import { formatMmSs, makeShutdownQrPayload, normalizeShutdownTemplate } from '../lib/shutdown'
import { uid } from '../lib/utils'
import { Btn, Card, Input, SectionTitle } from './ui'

function cloneTemplate(template: ShutdownTemplate): ShutdownTemplate {
  return {
    ...template,
    id: uid(),
    name: `${template.name} copy`,
    sections: template.sections.map((section) => ({
      ...section,
      id: uid(),
      items: [...section.items],
    })),
    updatedAt: new Date().toISOString(),
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ShutdownView({
  templates,
  activeTemplateId,
  onSaveTemplate,
  onDeleteTemplate,
  onSetActiveTemplate,
}: {
  templates: ShutdownTemplate[]
  activeTemplateId?: string
  onSaveTemplate: (template: ShutdownTemplate) => void
  onDeleteTemplate: (id: string) => void
  onSetActiveTemplate: (id: string) => void
}) {
  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? templates[0] ?? null
  const [draft, setDraft] = useState<ShutdownTemplate | null>(activeTemplate)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [killDone, setKillDone] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setDraft(activeTemplate)
    setStartedAt(null)
    setKillDone(false)
    setSecondsLeft((activeTemplate?.timerMinutes ?? 0) * 60)
    setChecked(new Set())
    setQrDataUrl('')
  }, [activeTemplate])

  useEffect(() => {
    if (!draft || !startedAt) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, draft.timerMinutes * 60 - Math.floor((Date.now() - startedAt) / 1000))
      setSecondsLeft(next)
    }, 250)
    return () => window.clearInterval(timer)
  }, [draft, startedAt])

  const flatItems = useMemo(
    () =>
      (draft?.sections ?? []).flatMap((section) =>
        section.items.map((item, idx) => ({
          key: `${section.id}-${idx}`,
          title: section.title,
          text: item,
        })),
      ),
    [draft],
  )

  useEffect(() => {
    if (!draft || !startedAt || !killDone) {
      setQrDataUrl('')
      return
    }
    const payload = makeShutdownQrPayload(draft, startedAt, uid())
    void QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: '#111111', light: '#f8f6f2' },
    }).then(setQrDataUrl)
  }, [draft, startedAt, killDone])

  if (!draft) {
    return <div className="mx-auto max-w-3xl py-16 text-center text-sm text-[var(--color-muted)]">Geen shutdown templates.</div>
  }

  const doneCount = flatItems.filter((item) => checked.has(item.key)).length
  const progressPct = flatItems.length > 0 ? Math.round((doneCount / flatItems.length) * 100) : 0
  const timerRunning = startedAt != null && secondsLeft > 0

  const updateDraft = (patch: Partial<ShutdownTemplate>) => {
    setDraft((current) => (current ? normalizeShutdownTemplate({ ...current, ...patch }, current) : current))
  }

  const saveDraft = () => {
    if (!draft) return
    onSaveTemplate(normalizeShutdownTemplate({ ...draft, updatedAt: new Date().toISOString() }, draft))
  }

  const startFlow = () => {
    setStartedAt(Date.now())
    setSecondsLeft(draft.timerMinutes * 60)
    setKillDone(false)
    setChecked(new Set())
  }

  const copyKillCommand = async () => {
    const text = draft.killCommand?.trim()
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-surface),var(--color-surface-overlay))] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Shutdown
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--color-text)] sm:text-4xl">
              {draft.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {draft.introMessage}
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--color-text)]">{draft.encouragement}</p>
          </div>
          <Card className="min-w-[15rem] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Timer</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-[var(--color-text)]">
              {formatMmSs(secondsLeft)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {timerRunning ? 'Running' : startedAt ? 'Finished' : `${draft.timerMinutes} min ready`}
            </p>
            <div className="mt-4 flex gap-2">
              <Btn onClick={startFlow} className="flex-1">
                <Play className="h-4 w-4" />
                Start
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setStartedAt(null)
                  setSecondsLeft(draft.timerMinutes * 60)
                  setKillDone(false)
                }}
              >
                Reset
              </Btn>
            </div>
          </Card>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <SectionTitle sub="Start de flow, run je kill helper, dan verschijnt de QR.">
              Flow
            </SectionTitle>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">1. Start</p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Start je shutdown zodat de timer effectief begint te lopen.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">2. Kill noise</p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  Run het lokale Windows script om je open distractions te killen.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">3. Scan</p>
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  QR wordt pas zichtbaar nadat stap 1 en 2 gebeurd zijn.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Local kill helper</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Browser kan niet zelf al je apps sluiten, dus deze command run je lokaal.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={copyKillCommand}>
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy command'}
                  </Btn>
                  <Btn variant={killDone ? 'primary' : 'ghost'} onClick={() => setKillDone((v) => !v)}>
                    <SquareTerminal className="h-4 w-4" />
                    {killDone ? 'Kill done' : 'Mark kill done'}
                  </Btn>
                </div>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--color-surface-overlay)] p-3 text-xs text-[var(--color-text)]">
{draft.killCommand || 'powershell -ExecutionPolicy Bypass -File ".\\tools\\zebbi-shutdown-kill.ps1"'}
              </pre>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">QR gate</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Visible only while your shutdown is active and kill step is confirmed.
                    </p>
                  </div>
                  <ScanLine className="h-4 w-4 text-[var(--color-muted)]" />
                </div>
                {!startedAt ? (
                  <p className="mt-6 text-sm text-[var(--color-muted)]">Start eerst je shutdown.</p>
                ) : !killDone ? (
                  <p className="mt-6 text-sm text-[var(--color-muted)]">Markeer eerst dat kill helper gelopen heeft.</p>
                ) : qrDataUrl ? (
                  <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <img src={qrDataUrl} alt="Shutdown QR" className="h-40 w-40 rounded-xl border border-[var(--color-border)] bg-white p-2" />
                    <div className="text-sm text-[var(--color-muted)]">
                      <p className="font-medium text-[var(--color-text)]">Ready to scan</p>
                      <p className="mt-1">Gebruik deze QR pas nadat je alarm afgaat.</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-[var(--color-muted)]">QR wordt opgebouwd…</p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-4 md:min-w-[13rem]">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Progress</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--color-text)]">
                  {progressPct}%
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {doneCount} / {flatItems.length} checked
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle sub="Je echte avondflow, stap voor stap.">Checklist</SectionTitle>
            <div className="space-y-5">
              {draft.imageDataUrl && (
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                  <img src={draft.imageDataUrl} alt={draft.imageName || 'Habit contracts'} className="max-h-72 w-full object-cover" />
                </div>
              )}

              {draft.sections.map((section) => (
                <div key={section.id} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((item, idx) => {
                      const key = `${section.id}-${idx}`
                      const done = checked.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setChecked((prev) => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }
                          className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            done
                              ? 'border-[var(--color-good)]/40 bg-[var(--color-good)]/10'
                              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
                          }`}
                        >
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              done
                                ? 'border-[var(--color-good)] bg-[var(--color-good)] text-white'
                                : 'border-[var(--color-border)] text-transparent'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className={done ? 'text-[var(--color-text)] line-through opacity-70' : 'text-[var(--color-text)]'}>
                            {item}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <SectionTitle sub="Meerdere shutdowns zijn ondersteund.">Templates</SectionTitle>
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSetActiveTemplate(template.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    template.id === draft.id
                      ? 'border-[var(--color-text)] bg-[var(--color-surface-overlay)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--color-text)]">{template.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{template.timerMinutes} min</p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Btn variant="ghost" onClick={() => onSaveTemplate(cloneTemplate(draft))}>
                <Plus className="h-4 w-4" />
                Duplicate
              </Btn>
              {templates.length > 1 && (
                <Btn variant="danger" onClick={() => onDeleteTemplate(draft.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Btn>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle sub="Pas de flow aan zonder code.">Editor</SectionTitle>
            <div className="space-y-4">
              <Input label="Template name" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
              <Input
                label="Timer (min)"
                type="number"
                min="1"
                max="60"
                value={draft.timerMinutes}
                onChange={(e) => updateDraft({ timerMinutes: parseInt(e.target.value, 10) || 1 })}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Intro message</span>
                <textarea
                  value={draft.introMessage}
                  onChange={(e) => updateDraft({ introMessage: e.target.value })}
                  className="min-h-24 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Encouragement</span>
                <textarea
                  value={draft.encouragement}
                  onChange={(e) => updateDraft({ encouragement: e.target.value })}
                  className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Kill command</span>
                <textarea
                  value={draft.killCommand ?? ''}
                  onChange={(e) => updateDraft({ killCommand: e.target.value })}
                  className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Habit contract image</span>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)]">
                  <ImagePlus className="h-4 w-4" />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const dataUrl = await fileToDataUrl(file)
                      updateDraft({ imageDataUrl: dataUrl, imageName: file.name })
                    }}
                  />
                </label>
              </label>

              {draft.sections.map((section, sectionIdx) => (
                <div key={section.id} className="rounded-xl border border-[var(--color-border)] p-3">
                  <Input
                    label={`Section ${sectionIdx + 1} title`}
                    value={section.title}
                    onChange={(e) =>
                      updateDraft({
                        sections: draft.sections.map((current) =>
                          current.id === section.id ? { ...current, title: e.target.value } : current,
                        ),
                      })
                    }
                  />
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Items (one per line)</span>
                    <textarea
                      value={section.items.join('\n')}
                      onChange={(e) =>
                        updateDraft({
                          sections: draft.sections.map((current) =>
                            current.id === section.id
                              ? {
                                  ...current,
                                  items: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean),
                                }
                              : current,
                          ),
                        })
                      }
                      className="min-h-28 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                    />
                  </label>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="ghost"
                  onClick={() =>
                    updateDraft({
                      sections: [...draft.sections, { id: uid(), title: `Section ${draft.sections.length + 1}`, items: ['New item'] }],
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add section
                </Btn>
                <Btn variant="primary" onClick={saveDraft}>
                  Save template
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
