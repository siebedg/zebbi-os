import { ArrowRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import { formatDateNL, todayISO } from '../lib/utils'
import { getCellStyle, formatFieldValue } from '../lib/colors'
import { useTheme } from '../hooks/useTheme'
import { Card, StatCard, Btn } from './ui'

const QUICK_FIELDS = [
  { key: 'wakeTime', label: 'Wake' },
  { key: 'sleepHours', label: 'Sleep' },
  { key: 'meditation', label: 'Meditation' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'totalHoursWorked', label: 'Worked' },
  { key: 'avgFocus', label: 'Focus' },
] as const

export function Dashboard({
  todayEntry,
  filledCount,
  onGoEntry,
}: {
  todayEntry?: DailyEntry
  filledCount: number
  onGoEntry: () => void
}) {
  const { theme } = useTheme()
  const today = todayISO()
  const entry = todayEntry ? enrichEntry(todayEntry) : undefined

  const completed = QUICK_FIELDS.filter((f) => {
    const v = entry?.[f.key as keyof DailyEntry]
    return v != null && v !== ''
  }).length
  const pct = Math.round((completed / QUICK_FIELDS.length) * 100)

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-muted)]">{formatDateNL(today, 'EEEE d MMMM')}</p>
            <h2 className="mt-0.5 text-lg font-semibold">Vandaag</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {pct === 100 ? 'Alles ingevuld.' : `${completed} van ${QUICK_FIELDS.length} velden`}
            </p>
            <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
              <div
                className="h-full rounded-full bg-[var(--color-text)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Btn onClick={onGoEntry}>
            {pct === 100 ? 'Bewerken' : 'Invullen'}
            <ArrowRight className="h-4 w-4" />
          </Btn>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dagen gelogd" value={String(filledCount)} />
        <StatCard
          label="Worked vandaag"
          value={entry?.totalHoursWorked != null ? `${entry.totalHoursWorked}u` : '—'}
        />
        <StatCard
          label="Net uren"
          value={entry?.totalHoursNet != null ? `${entry.totalHoursNet}u` : '—'}
        />
        <StatCard
          label="Focus"
          value={entry?.avgFocus != null ? `${entry.avgFocus}%` : '—'}
        />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Status vandaag</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_FIELDS.map(({ key, label }) => {
            void theme
            const val = entry?.[key as keyof DailyEntry]
            const done = val != null && val !== ''
            const style = done ? getCellStyle(key, val) : null
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                style={style ? { background: style.bg } : undefined}
              >
                <span className="text-sm text-[var(--color-muted)]">{label}</span>
                <span className="text-sm font-medium tabular-nums" style={{ color: style?.text ?? '#a1a1aa' }}>
                  {done ? formatFieldValue(key, val) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
