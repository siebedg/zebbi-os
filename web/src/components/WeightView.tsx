import { useMemo, useState } from 'react'
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
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
import { WEIGHT_GOAL_DATE, WEIGHT_GOAL_KG } from '../lib/weightGoal'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Btn, Input } from './ui'

function formatKg(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        actual: '#34d399',
        project: '#71717a',
        goal: '#fbbf24',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        actual: '#059669',
        project: '#a1a1aa',
        goal: '#d97706',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
}

type ChartRow = {
  date: string
  label: string
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [kg, setKg] = useState('')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

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

  /**
   * Two series:
   * - actual: real check-ins only (with dots)
   * - project: separate path from last check-in → goal (pace if you hit 75 kg)
   */
  const chartData = useMemo(() => {
    if (sorted.length === 0) return [] as ChartRow[]

    const rows: ChartRow[] = sorted.map((e) => ({
      date: e.date,
      label: format(parseISO(e.date), isMobile ? 'd/M' : 'd MMM', { locale: nl }),
      actual: e.kg,
      project: null,
    }))

    const last = sorted[sorted.length - 1]
    if (last.date >= WEIGHT_GOAL_DATE) return rows

    // Join point: last actual also starts the projection line
    rows[rows.length - 1] = {
      ...rows[rows.length - 1],
      project: last.kg,
    }

    const start = parseISO(last.date)
    const totalDays = Math.max(1, differenceInCalendarDays(goalDate, start))
    // Intermediate weekly dots on projection (no actual) so the 2nd line is obvious
    const steps = Math.max(1, Math.min(12, Math.floor(totalDays / 7)))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const d = addDays(start, Math.round(totalDays * t))
      const dateStr = format(d, 'yyyy-MM-dd')
      if (dateStr === WEIGHT_GOAL_DATE) continue
      const kgVal = last.kg + (WEIGHT_GOAL_KG - last.kg) * t
      rows.push({
        date: dateStr,
        label: format(d, isMobile ? 'd/M' : 'd MMM', { locale: nl }),
        actual: null,
        project: Math.round(kgVal * 10) / 10,
      })
    }

    rows.push({
      date: WEIGHT_GOAL_DATE,
      label: format(goalDate, isMobile ? 'd/M' : 'd MMM', { locale: nl }),
      actual: null,
      project: WEIGHT_GOAL_KG,
    })

    return rows
  }, [sorted, isMobile, goalDate])

  const domain = useMemo(() => {
    const vals = sorted.map((e) => e.kg)
    vals.push(WEIGHT_GOAL_KG)
    if (vals.length === 0) return [70, 80]
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const pad = 1.2
    return [Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10]
  }, [sorted])

  const add = () => {
    const w = parseFloat(kg.replace(',', '.'))
    if (!date || Number.isNaN(w)) return
    onUpsert({ date, kg: Math.round(w * 100) / 100 })
    setKg('')
    setAddOpen(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Hero */}
      <header className="pt-1 text-center">
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
          </>
        ) : (
          <p className="mt-6 text-sm text-[var(--color-muted)]">Nog geen check-in</p>
        )}
      </header>

      {/* Graph — primary */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
          <p className="text-xs text-[var(--color-muted)]">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: palette.actual }} />
            Actual
            <span className="mx-2 opacity-30">/</span>
            <span
              className="mr-1 inline-block w-3 align-middle border-t border-dashed"
              style={{ borderColor: palette.project }}
            />
            Projected → {formatKg(WEIGHT_GOAL_KG)} kg
          </p>
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
                margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -12 : -4, bottom: 0 }}
              >
                <CartesianGrid stroke={palette.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: palette.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
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
                    return [`${formatKg(v)} kg`, name === 'project' ? 'Projected' : 'Actual']
                  }}
                />
                <ReferenceLine
                  y={WEIGHT_GOAL_KG}
                  stroke={palette.goal}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  ifOverflow="extendDomain"
                />
                {/* Projected first (under), actual on top */}
                <Line
                  type="linear"
                  dataKey="project"
                  name="project"
                  stroke={palette.project}
                  strokeWidth={2}
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
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: palette.actual, strokeWidth: 0 }}
                  activeDot={{ r: 5.5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Goal — compact, secondary to graph */}
      {latest && remaining != null && (
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
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
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
            <div>
              <p className="text-[10px] text-[var(--color-muted)]">Δ check-in</p>
              <p
                className={`font-medium tabular-nums ${
                  vsPrev == null
                    ? 'text-[var(--color-text)]'
                    : vsPrev > 0
                      ? 'text-[var(--color-good)]'
                      : vsPrev < 0
                        ? 'text-[var(--color-bad)]'
                        : 'text-[var(--color-text)]'
                }`}
              >
                {vsPrev == null ? '—' : `${vsPrev > 0 ? '+' : ''}${formatKg(vsPrev)} kg`}
              </p>
            </div>
          </div>
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
                {[...sorted].reverse().map((e) => (
                  <tr key={e.date} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 text-[var(--color-muted)]">
                      {format(parseISO(e.date), 'd MMM yyyy', { locale: nl })}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-[var(--color-text)]">
                      {formatKg(e.kg)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
