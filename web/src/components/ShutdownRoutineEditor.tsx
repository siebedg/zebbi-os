import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ShutdownSection, ShutdownTemplate } from '../types'
import { uid } from '../lib/utils'
import { Btn, Card, Input } from './ui'

function cloneTemplate(template: ShutdownTemplate): ShutdownTemplate {
  return {
    ...template,
    sections: template.sections.map((s) => ({
      ...s,
      items: [...s.items],
    })),
  }
}

export function ShutdownRoutineEditor({
  templates,
  activeTemplateId,
  onSave,
  onSetActive,
}: {
  templates: ShutdownTemplate[]
  activeTemplateId?: string
  onSave: (template: ShutdownTemplate) => void
  onSetActive?: (id: string) => void
}) {
  const active =
    templates.find((t) => t.id === activeTemplateId) ??
    templates.find((t) => /daily/i.test(t.name)) ??
    templates[0]

  const [draft, setDraft] = useState<ShutdownTemplate | null>(active ? cloneTemplate(active) : null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!active) {
      setDraft(null)
      return
    }
    setDraft(cloneTemplate(active))
    setSavedFlash(false)
  }, [active?.id, active?.updatedAt])

  if (!active || !draft) return null

  const patch = (partial: Partial<ShutdownTemplate>) => setDraft((d) => (d ? { ...d, ...partial } : d))

  const patchSection = (sectionId: string, partial: Partial<ShutdownSection>) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: d.sections.map((s) => (s.id === sectionId ? { ...s, ...partial } : s)),
          }
        : d,
    )
  }

  const removeSection = (sectionId: string) => {
    setDraft((d) =>
      d ? { ...d, sections: d.sections.filter((s) => s.id !== sectionId) } : d,
    )
  }

  const addSection = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: [...d.sections, { id: uid(), title: 'New section', items: [''] }],
          }
        : d,
    )
  }

  const patchItem = (sectionId: string, index: number, value: string) => {
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s
          const items = [...s.items]
          items[index] = value
          return { ...s, items }
        }),
      }
    })
  }

  const addItem = (sectionId: string) => {
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId ? { ...s, items: [...s.items, ''] } : s,
        ),
      }
    })
  }

  const removeItem = (sectionId: string, index: number) => {
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s
          const items = s.items.filter((_, i) => i !== index)
          return { ...s, items: items.length ? items : [''] }
        }),
      }
    })
  }

  const handleSave = () => {
    const sections = draft.sections
      .map((s) => ({
        ...s,
        title: s.title.trim() || 'Section',
        items: s.items.map((item) => item.trim()).filter(Boolean),
      }))
      .filter((s) => s.items.length > 0)

    onSave({
      ...draft,
      sections,
      updatedAt: new Date().toISOString(),
    })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  return (
    <div className="space-y-4">
      {templates.length > 1 && onSetActive && (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSetActive(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                t.id === active.id
                  ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <Input
        label="Routine name"
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
      />

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Intro (shutdown page)
        </span>
        <textarea
          rows={3}
          value={draft.introMessage}
          onChange={(e) => patch({ introMessage: e.target.value })}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)]/40"
        />
      </label>

      <Input
        label="Timer (minutes)"
        type="number"
        min={1}
        max={60}
        value={draft.timerMinutes}
        onChange={(e) => patch({ timerMinutes: Number(e.target.value) || 15 })}
      />

      <div className="space-y-3">
        {draft.sections.map((section, sectionIdx) => (
          <Card key={section.id} className="p-4">
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  label={`Subtitle ${sectionIdx + 1}`}
                  value={section.title}
                  onChange={(e) => patchSection(section.id, { title: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="mt-6 rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-bad)]"
                aria-label="Remove section"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Todo&apos;s
            </p>
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => (
                <div key={`${section.id}-${itemIdx}`} className="flex gap-2">
                  <input
                    value={item}
                    onChange={(e) => patchItem(section.id, itemIdx, e.target.value)}
                    placeholder="Shutdown step…"
                    className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)]/40"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(section.id, itemIdx)}
                    className="shrink-0 rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-bad)]"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addItem(section.id)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add todo
            </button>
          </Card>
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        <Plus className="h-4 w-4" />
        Add section
      </button>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Btn onClick={handleSave}>Save routine</Btn>
        {savedFlash && (
          <span className="text-sm text-[var(--color-muted)]">Saved — live on Shutdown.</span>
        )}
      </div>
    </div>
  )
}
