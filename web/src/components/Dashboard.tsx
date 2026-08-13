import { ArrowRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import { formatDateNL, todayISO } from '../lib/utils'
import { getCellStyle, formatFieldValue } from '../lib/colors'
import { useTheme } from '../hooks/useTheme'
import { Card, StatCard, Btn, PageHeader } from './ui'

const QUICK_FIELDS = [
  { key: 'wakeTime', label: 'Wake' },
  { key: 'sleepHours', label: 'Sleep' },
  { key: 'meditation', label: 'Meditation' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'totalHoursNet', label: 'Worked' },
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
  const { theme, indicatorMode } = useTheme()
  const today = todayISO()
  const entry = todayEntry ? enrichEntry(todayEntry) : undefined

  const completed = QUICK_FIELDS.filter((f) => {
    const v = entry?.[f.key as keyof DailyEntry]
    return v != null && v !== ''
  }).length
  const pct = Math.round((completed / QUICK_FIELDS.length) * 100)

  return (
    <div className="osc-fade-up space-y-8">
      <PageHeader
        eyebrow="Vandaag"
        title={
          <>
            {formatDateNL(today, 'EEEE')}{' '}
            <span className="italic">{formatDateNL(today, 'd MMMM')}</span>
          </>
        }
        sub={pct === 100 ? 'Alles ingevuld.' : `${completed} van ${QUICK_FIELDS.length} velden`}
      />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
            <div
              className="h-full rounded-full bg-[var(--color-text)] transition-all"
              style={{ width: `${pct}%` }}
            />
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
          label="Net gewerkt"
          value={entry?.totalHoursNet != null ? `${entry.totalHoursNet}u` : '—'}
        />
        <StatCard
          label="Bruto"
          value={entry?.totalHoursWorked != null ? `${entry.totalHoursWorked}u` : '—'}
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
            const val = entry?.[key as keyof DailyEntry]
            const done = val != null && val !== ''
            const style = done ? getCellStyle(key, val, entry, theme, indicatorMode) : null
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5"
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
