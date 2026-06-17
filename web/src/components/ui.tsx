import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import { formatTime12, parseTime12To24 } from '../lib/utils'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3 sm:mb-4">
      <h2 className="text-base font-semibold text-[var(--color-text)]">{children}</h2>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)] sm:text-sm">{sub}</p>}
    </div>
  )
}

export function Btn({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary:
      'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-text)] hover:opacity-90 border border-transparent',
    ghost:
      'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
    danger:
      'bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-bad)] hover:bg-[var(--color-danger-bg-hover)]',
  }
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors sm:min-h-0 sm:px-3.5 sm:py-2 ${styles[variant]} disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">{label}</span>
      )}
      <input
        className={`w-full min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 sm:min-h-0 sm:py-2 sm:text-sm ${className}`}
        {...props}
      />
    </label>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition ${
        checked
          ? 'border-[var(--color-toggle-checked-border)] bg-[var(--color-toggle-checked-bg)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
      }`}
    >
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? 'bg-[var(--color-toggle-on)]' : 'bg-[var(--color-neutral)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--color-toggle-knob)] shadow transition ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

export function HabitChoice({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | undefined
  onChange: (v: boolean | undefined) => void
}) {
  const options: { key: string; pick: boolean | undefined; text: string }[] = [
    { key: 'unset', pick: undefined, text: '—' },
    { key: 'yes', pick: true, text: '✓' },
    { key: 'no', pick: false, text: '✗' },
  ]

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => {
          const active = value === o.pick
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.pick)}
              className={`min-w-[2.5rem] rounded-md border px-2 py-1.5 text-sm font-medium transition ${
                active
                  ? o.pick === true
                    ? 'border-[var(--color-good)] bg-[var(--color-good)]/15 text-[var(--color-good)]'
                    : o.pick === false
                      ? 'border-[var(--color-bad)] bg-[var(--color-bad)]/15 text-[var(--color-bad)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-overlay)] text-[var(--color-muted)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)]'
              }`}
            >
              {o.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TimeInput12({
  value,
  onChange,
  className = '',
}: {
  value: string
  onChange: (hhmm: string) => void
  className?: string
}) {
  const [text, setText] = useState(() => (value ? formatTime12(value) : ''))

  useEffect(() => {
    setText(value ? formatTime12(value) : '')
  }, [value])

  return (
    <input
      type="text"
      inputMode="text"
      placeholder="10:46 PM"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const trimmed = text.trim()
        if (!trimmed) {
          onChange('')
          setText('')
          return
        }
        const parsed = parseTime12To24(trimmed)
        if (parsed) {
          onChange(parsed)
          setText(formatTime12(parsed))
        } else {
          setText(value ? formatTime12(value) : '')
        }
      }}
      className={`w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 ${className}`}
    />
  )
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p>}
    </div>
  )
}
