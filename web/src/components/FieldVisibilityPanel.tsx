import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FIELD_VISIBILITY_LABELS, type FieldVisibilityKey } from '../lib/fieldVisibility'
import { useFieldVisibility } from '../hooks/useFieldVisibility'
import { Toggle } from './ui'

const ORDER: FieldVisibilityKey[] = [
  'wakeTime',
  'bedTime',
  'sleepHours',
  'sleepScore',
  'gratitude',
]

export function FieldVisibilityPanel({ className = '' }: { className?: string }) {
  const { visibility, setVisible } = useFieldVisibility()
  const [open, setOpen] = useState(false)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-left text-xs font-medium text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]"
      >
        <span>Velden tonen</span>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--color-muted)] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-2">
          {ORDER.map((key) => (
            <Toggle
              key={key}
              label={FIELD_VISIBILITY_LABELS[key]}
              checked={visibility[key]}
              onChange={(v) => setVisible(key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
