import { useMemo, useState } from 'react'
import {
  differenceInCalendarDays,
  format,
  parseISO,
  subYears,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { WeightEntry } from '../types'
import {
  WEIGHT_GOAL_DATE,
  WEIGHT_GOAL_KG,
  checkWeightSchedule,
  projectedKgAt,
} from '../lib/weightGoal'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Btn, Input } from './ui'

type RangeKey = '1y' | 'all'

function formatKg(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        actual: '#34d399',
        project: '#737373',
        goal: '#fbbf24',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        actual: '#059669',
        project: '#a3a3a3',
        goal: '#d97706',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
}

type ChartRow = {
  t: number
  date: string
  actual: number | null
  project: number | null
}

export function WeightView({
  entries,
  onUpsert,
  onDelete,
}: {
  entries: WeightEntry[]
  onUpsert: (e: WeightEntry) => void
  onDelete: (date: string) => void
}) {
  const { theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const palette = chartPalette(theme)
  const [range, setRange] = useState<RangeKey>('all')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [kg, setKg] = useState('')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  const planStart = sorted[0] ?? null
  const latest = sorted[sorted.length - 1]
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null

  const goalDate = parseISO(WEIGHT_GOAL_DATE)
  const daysLeft = latest
    ? Math.max(0, differenceInCalendarDays(goalDate, parseISO(latest.date)))
    : Math.max(0, differenceInCalendarDays(goalDate, new Date()))
  const weeksLeft = daysLeft / 7

  const remaining =
    latest != null ? Math.round((WEIGHT_GOAL_KG - latest.kg) * 10) / 10 : null
  const neededPerWeek =
    remaining != null && weeksLeft > 0
      ? Math.round((remaining / weeksLeft) * 100) / 100
      : null

  const vsPrev =
    latest && previous
      ? Math.round((latest.kg - previous.kg) * 10) / 10
      : null

  const schedule =
    latest && planStart
      ? checkWeightSchedule(latest.kg, latest.date, planStart.date, planStart.kg)
      : null

  const filtered = useMemo(() => {
    if (range === 'all' || sorted.length === 0) return sorted
    const anchor = sorted[sorted.length - 1]?.date ?? format(new Date(), 'yyyy-MM-dd')
    const cutoff = format(subYears(parseISO(anchor), 1), 'yyyy-MM-dd')
    return sorted.filter((e) => e.date >= cutoff)
  }, [sorted, range])

  /**
   * Fixed plan line: first check-in → goal date.
   * Actuals sit on top; "op schema" = actual vs that line on the same date.
   */
  const chartData = useMemo(() => {
    if (filtered.length === 0 || !planStart) return [] as ChartRow[]

    const byDate = new Map<string, ChartRow>()

    const upsert = (dateStr: string, patch: Partial<ChartRow>) => {
      const prev = byDate.get(dateStr)
      byDate.set(dateStr, {
        t: parseISO(dateStr).getTime(),
        date: dateStr,
        actual: prev?.actual ?? null,
        project: prev?.project ?? null,
        ...patch,
      })
    }

    // Schedule anchors in view
    const viewStart = filtered[0].date
    const scheduleFrom = viewStart < planStart.date ? planStart.date : viewStart
    if (scheduleFrom <= WEIGHT_GOAL_DATE) {
      upsert(scheduleFrom, {
        project: projectedKgAt(scheduleFrom, planStart.date, planStart.kg),
      })
    }

    for (const e of filtered) {
      upsert(e.date, {
        actual: e.kg,
        project:
          e.date <= WEIGHT_GOAL_DATE
            ? projectedKgAt(e.date, planStart.date, planStart.kg)
            : null,
      })
    }

    if (filtered[filtered.length - 1].date < WEIGHT_GOAL_DATE) {
      upsert(WEIGHT_GOAL_DATE, { project: WEIGHT_GOAL_KG, actual: null })
    }

    return [...byDate.values()].sort((a, b) => a.t - b.t)
  }, [filtered, planStart])

  const domain = useMemo(() => {
    const vals = filtered.map((e) => e.kg)
    vals.push(WEIGHT_GOAL_KG)
    if (planStart) {
      vals.push(planStart.kg)
      if (latest) {
        vals.push(projectedKgAt(latest.date, planStart.date, planStart.kg))
      }
    }
    if (vals.length === 0) return [70, 80]
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = 1.2
    return [Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10]
  }, [filtered, planStart, latest])

  const add = () => {
    const w = parseFloat(kg.replace(',', '.'))
    if (!date || Number.isNaN(w)) return
    onUpsert({ date, kg: Math.round(w * 100) / 100 })
    setKg('')
    setAddOpen(false)
  }

  const xTickFormatter = (ms: number) => {
    try {
      return format(new Date(ms), isMobile ? 'MMM yy' : 'MMM yyyy', { locale: nl })
    } catch {
      return ''
    }
  }

  const scheduleTone =
    schedule == null
      ? 'text-[var(--color-muted)]'
      : schedule.status === 'on'
        ? 'text-[var(--color-good)]'
        : schedule.status === 'ahead'
          ? 'text-[var(--color-good)]'
          : 'text-[var(--color-bad)]'

  const scheduleLabel =
    schedule == null
      ? null
      : schedule.status === 'on'
        ? 'Op schema'
        : schedule.status === 'ahead'
          ? `${formatKg(Math.abs(schedule.deltaKg))} kg voor`
          : `${formatKg(Math.abs(schedule.deltaKg))} kg achter`

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col justify-center md:min-h-[calc(100dvh-3rem)]">
      <div className="mx-auto w-full max-w-lg space-y-6 py-6">
        {/* Hero */}
        <header className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Gewicht
          </p>
          {latest ? (
            <>
              <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums text-[var(--color-text)] sm:text-6xl">
                {formatKg(latest.kg)}
                <span className="ml-1 text-2xl font-normal text-[var(--color-muted)]">kg</span>
              </p>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                Laatste check-in · {format(parseISO(latest.date), 'd MMMM yyyy', { locale: nl })}
              </p>
              {schedule && (
                <p className={`mt-2 text-sm font-medium ${scheduleTone}`}>
                  {scheduleLabel}
                  <span className="font-normal text-[var(--color-muted)]">
                    {' '}
                    · schema {formatKg(schedule.expectedKg)} kg
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="mt-6 text-sm text-[var(--color-muted)]">Nog geen check-in</p>
          )}
        </header>

        {/* Tiny range pills */}
        <div className="flex justify-center gap-1">
          {(
            [
              { key: 'all' as const, label: 'All' },
              { key: '1y' as const, label: '1J' },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                range === r.key
                  ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Graph */}
        <div>
          <div className="mb-2 flex justify-center gap-3 text-[10px] text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-3" style={{ background: palette.actual }} />
              Actual
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 border-t border-dashed"
                style={{ borderColor: palette.project }}
              />
              Schema
            </span>
          </div>
          <div className="h-64 w-full sm:h-72">
            {chartData.length < 1 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                Voeg je eerste weekgemiddelde toe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: isMobile ? 10 : 18, left: isMobile ? -8 : 0, bottom: 4 }}
                >
                  <CartesianGrid stroke={palette.grid} vertical={false} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={xTickFormatter}
                    tick={{ fill: palette.tick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    scale="time"
                    minTickGap={40}
                  />
                  <YAxis
                    domain={domain}
                    tick={{ fill: palette.tick, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 32 : 36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: palette.tooltipBg,
                      border: `1px solid ${palette.tooltipBorder}`,
                      borderRadius: 12,
                      fontSize: 13,
                      color: palette.tooltipText,
                    }}
                    labelFormatter={(_, payload) => {
                      const d = payload?.[0]?.payload?.date
                      return d ? format(parseISO(d), 'd MMM yyyy', { locale: nl }) : ''
                    }}
                    formatter={(v: number, name: string) => {
                      if (v == null) return [null, null]
                      return [`${formatKg(v)} kg`, name === 'project' ? 'Schema' : 'Actual']
                    }}
                  />
                  <ReferenceLine
                    y={WEIGHT_GOAL_KG}
                    stroke={palette.goal}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <Line
                    type="linear"
                    dataKey="project"
                    name="project"
                    stroke={palette.project}
                    strokeWidth={1.75}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="actual"
                    stroke={palette.actual}
                    strokeWidth={2}
                    dot={{ r: 1.5, fill: palette.actual, strokeWidth: 0 }}
                    activeDot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Goal + schedule */}
        {latest && remaining != null && schedule && (
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">Doel</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-text)]">
                  {formatKg(WEIGHT_GOAL_KG)} kg
                  <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                    {format(goalDate, 'd MMM yyyy', { locale: nl })}
                  </span>
                </p>
              </div>
              {daysLeft > 0 && (
                <p className="text-xs text-[var(--color-muted)]">{Math.ceil(weeksLeft)} weken</p>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-[var(--color-muted)]">Schema</p>
                <p className="font-medium tabular-nums text-[var(--color-text)]">
                  {formatKg(schedule.expectedKg)} kg
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted)]">Vs schema</p>
                <p className={`font-medium tabular-nums ${scheduleTone}`}>{scheduleLabel}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted)]">Nog</p>
                <p className="font-medium tabular-nums text-[var(--color-text)]">
                  {remaining > 0 ? `+${formatKg(remaining)}` : formatKg(remaining)} kg
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted)]">Pace</p>
                <p className="font-medium tabular-nums text-[var(--color-text)]">
                  {neededPerWeek != null
                    ? `${neededPerWeek > 0 ? '+' : ''}${formatKg(neededPerWeek)}/w`
                    : '—'}
                </p>
              </div>
            </div>
            {vsPrev != null && (
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                Δ check-in{' '}
                <span
                  className={
                    vsPrev > 0
                      ? 'text-[var(--color-good)]'
                      : vsPrev < 0
                        ? 'text-[var(--color-bad)]'
                        : 'text-[var(--color-text)]'
                  }
                >
                  {vsPrev > 0 ? '+' : ''}
                  {formatKg(vsPrev)} kg
                </span>
              </p>
            )}
          </div>
        )}

        {/* Subtle actions */}
        <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex w-full items-center justify-between py-1.5 text-left text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Weekgemiddelde toevoegen
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition ${addOpen ? 'rotate-180' : ''}`} />
          </button>
          {addOpen && (
            <div className="space-y-3 pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-[var(--color-muted)]">Datum</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="w-full sm:w-28">
                  <label className="mb-1 block text-xs text-[var(--color-muted)]">kg</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="72,4"
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                  />
                </div>
                <Btn type="button" onClick={add} className="w-full sm:w-auto !py-2 !text-xs">
                  Opslaan
                </Btn>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between py-1.5 text-left text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <span>
              Check-ins
              <span className="ml-1 opacity-70">({sorted.length})</span>
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
          {historyOpen && (
            <div className="max-h-56 overflow-y-auto scroll-touch">
              <table className="w-full text-sm">
                <tbody>
                  {[...sorted].reverse().map((e) => {
                    const rowSchedule = planStart
                      ? checkWeightSchedule(e.kg, e.date, planStart.date, planStart.kg)
                      : null
                    return (
                      <tr key={e.date} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-2 text-[var(--color-muted)]">
                          {format(parseISO(e.date), 'd MMM yyyy', { locale: nl })}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-[var(--color-text)]">
                          {formatKg(e.kg)}
                        </td>
                        <td className="py-2 pl-3 text-right text-[10px] text-[var(--color-muted)]">
                          {rowSchedule
                            ? rowSchedule.status === 'on'
                              ? 'op schema'
                              : rowSchedule.status === 'ahead'
                                ? 'voor'
                                : 'achter'
                            : ''}
                        </td>
                        <td className="w-8 py-2 pl-2">
                          <button
                            type="button"
                            onClick={() => onDelete(e.date)}
                            className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-bad)]"
                            aria-label="Verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
