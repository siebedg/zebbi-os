import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime12, parseTime12To24 } from '../lib/utils'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  align = 'center',
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  sub?: ReactNode
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <header className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-[2.15rem] font-medium leading-[1.15] tracking-[-0.02em] text-[var(--color-text)] sm:text-[3rem]">
        {title}
      </h1>
      {sub && (
        <p
          className={`mt-3 text-sm leading-relaxed text-[var(--color-muted)] ${
            align === 'center' ? 'mx-auto max-w-md' : 'max-w-lg'
          }`}
        >
          {sub}
        </p>
      )}
    </header>
  )
}

export function Pill({
  active,
  onClick,
  children,
  className = '',
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
          : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function MonthNav({
  label,
  onPrev,
  onNext,
  prevDisabled,
}: {
  label: string
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Vorige maand"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[9.5rem] select-none text-center text-[13px] capitalize tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
        aria-label="Volgende maand"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3 sm:mb-4">
      <h2 className="font-display text-xl font-medium tracking-tight text-[var(--color-text)]">
        {children}
      </h2>
      {sub && <p className="mt-1 text-xs text-[var(--color-muted)] sm:text-sm">{sub}</p>}
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
      'bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]',
    danger:
      'bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-bad)] hover:bg-[var(--color-danger-bg-hover)]',
  }
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:min-h-0 sm:px-4 sm:py-2 ${styles[variant]} disabled:opacity-50 ${className}`}
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
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {label}
        </span>
      )}
      <input
        className={`w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)]/40 focus:ring-2 focus:ring-[var(--color-text)]/8 sm:min-h-0 sm:py-2 sm:text-sm ${className}`}
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
      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
        checked
          ? 'border-[var(--color-border)] bg-[var(--color-surface-overlay)]'
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
              className={`min-w-[2.5rem] rounded-full border px-2.5 py-1.5 text-sm font-medium transition ${
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
      className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)]/40 focus:ring-2 focus:ring-[var(--color-text)]/8 ${className}`}
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
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 font-display text-3xl font-medium tracking-tight tabular-nums text-[var(--color-text)]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-muted)]">{sub}</p>}
    </div>
  )
}
