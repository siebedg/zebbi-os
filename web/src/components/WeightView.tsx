import { useMemo, useState } from 'react'
import {
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
import { ChevronDown, Plus, Target, Trash2 } from 'lucide-react'
import type { WeightEntry } from '../types'
import { WEIGHT_GOAL_DATE, WEIGHT_GOAL_KG } from '../lib/weightGoal'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Btn, Card, Input } from './ui'

function formatKg(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        actual: '#34d399',
        project: '#a1a1aa',
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

  /** Chart: actual check-ins + dashed projection to goal */
  const chartData = useMemo(() => {
    if (sorted.length === 0) return [] as {
      date: string
      label: string
      actual: number | null
      project: number | null
    }[]

    const actual = sorted.map((e) => ({
      date: e.date,
      label: format(parseISO(e.date), isMobile ? 'd/M' : 'd MMM', { locale: nl }),
      actual: e.kg as number | null,
      project: null as number | null,
    }))

    const last = sorted[sorted.length - 1]
    if (last.date >= WEIGHT_GOAL_DATE) return actual

    const rows = actual.map((row, i) =>
      i === actual.length - 1 ? { ...row, project: row.actual } : row,
    )

    rows.push({
      date: WEIGHT_GOAL_DATE,
      label: format(goalDate, isMobile ? 'd/M' : 'd MMM', { locale: nl }),
      actual: null,
      project: WEIGHT_GOAL_KG,
    })

    return rows
  }, [sorted, isMobile, goalDate])

  const progressPct = useMemo(() => {
    if (!latest || sorted.length === 0) return 0
    const start = sorted[0].kg
    const span = WEIGHT_GOAL_KG - start
    if (Math.abs(span) < 0.05) return latest.kg >= WEIGHT_GOAL_KG ? 100 : 0
    return Math.min(100, Math.max(0, ((latest.kg - start) / span) * 100))
  }, [latest, sorted])

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
    <div className="mx-auto max-w-lg space-y-5">
      <header className="pt-1 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Gewicht
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Wekelijks MacroFactor-average · geen dagelijkse dubbele log
        </p>

        {latest ? (
          <>
            <p className="mt-3 text-5xl font-semibold tracking-tight tabular-nums text-[var(--color-text)] sm:text-6xl">
              {formatKg(latest.kg)}
              <span className="ml-1 text-2xl font-normal text-[var(--color-muted)]">kg</span>
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Laatste check-in · {format(parseISO(latest.date), 'd MMMM yyyy', { locale: nl })}
            </p>
          </>
        ) : (
          <p className="mt-6 text-sm text-[var(--color-muted)]">Nog geen weekgemiddelde</p>
        )}
      </header>

      {/* Goal card */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-overlay)]">
            <Target className="h-4 w-4 text-[var(--color-muted)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Doel {formatKg(WEIGHT_GOAL_KG)} kg
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {format(goalDate, 'd MMMM yyyy', { locale: nl })}
              {daysLeft > 0 ? ` · ${Math.ceil(weeksLeft)} weken` : ' · deadline bereikt'}
            </p>

            {remaining != null && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-[var(--color-surface-overlay)] px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Nog</p>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-text)]">
                    {remaining > 0 ? `+${formatKg(remaining)}` : formatKg(remaining)}
                    <span className="text-xs font-normal text-[var(--color-muted)]"> kg</span>
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-overlay)] px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Pace</p>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-text)]">
                    {neededPerWeek != null ? (
                      <>
                        {neededPerWeek > 0 ? '+' : ''}
                        {formatKg(neededPerWeek)}
                        <span className="text-xs font-normal text-[var(--color-muted)]">/w</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-overlay)] px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Δ week</p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      vsPrev == null
                        ? 'text-[var(--color-text)]'
                        : vsPrev > 0
                          ? 'text-[var(--color-good)]'
                          : vsPrev < 0
                            ? 'text-[var(--color-bad)]'
                            : 'text-[var(--color-text)]'
                    }`}
                  >
                    {vsPrev == null
                      ? '—'
                      : `${vsPrev > 0 ? '+' : ''}${formatKg(vsPrev)}`}
                  </p>
                </div>
              </div>
            )}

            {latest && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
                <div
                  className="h-full rounded-full bg-[var(--color-text)] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Progress graph */}
      <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-[var(--color-muted)]">Progress → goal</p>
          <p className="text-[10px] text-[var(--color-muted)]">
            <span className="inline-block h-0.5 w-3 align-middle" style={{ background: palette.actual }} />{' '}
            check-ins
            <span className="mx-1.5 opacity-40">·</span>
            <span
              className="inline-block h-0.5 w-3 align-middle border-t border-dashed"
              style={{ borderColor: palette.project }}
            />{' '}
            projectie
          </p>
        </div>
        <div className="h-56 w-full sm:h-64">
          {chartData.length < 1 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
              Voeg je eerste weekgemiddelde toe
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 12, right: isMobile ? 8 : 16, left: isMobile ? -12 : -4, bottom: 0 }}
              >
                <CartesianGrid stroke={palette.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: palette.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
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
                    if (v == null) return [null, '']
                    const label = name === 'project' ? 'Projectie' : 'Check-in'
                    return [`${formatKg(v)} kg`, label]
                  }}
                />
                <ReferenceLine
                  y={WEIGHT_GOAL_KG}
                  stroke={palette.goal}
                  strokeDasharray="4 4"
                  strokeWidth={1.25}
                  label={{
                    value: `${WEIGHT_GOAL_KG}`,
                    position: 'insideTopRight',
                    fill: palette.goal,
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={palette.actual}
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: palette.actual, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="linear"
                  dataKey="project"
                  stroke={palette.project}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Weekly check-in */}
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--color-muted)]" />
            Weekgemiddelde toevoegen
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition ${addOpen ? 'rotate-180' : ''}`} />
        </button>
        {addOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted)]">
              Pak in MacroFactor je weekgemiddelde (of trend weight), noteer die hier. Geen dagelijkse
              entries nodig.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Datum check-in</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-28">
                <label className="mb-1 block text-xs text-[var(--color-muted)]">kg (avg)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="72,4"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                />
              </div>
              <Btn type="button" onClick={add} className="w-full sm:w-auto">
                Opslaan
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {/* History */}
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span>
            Check-ins
            <span className="ml-2 font-normal text-[var(--color-muted)]">({sorted.length})</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition ${historyOpen ? 'rotate-180' : ''}`} />
        </button>
        {historyOpen && (
          <div className="max-h-72 overflow-y-auto border-t border-[var(--color-border)] scroll-touch">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)]">
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                  <th className="px-4 py-2 text-left text-xs font-medium">Datum</th>
                  <th className="px-4 py-2 text-right text-xs font-medium">kg</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((e) => (
                  <tr key={e.date} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-2.5 text-[var(--color-text)]">
                      {format(parseISO(e.date), 'd MMM yyyy', { locale: nl })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--color-text)]">
                      {formatKg(e.kg)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onDelete(e.date)}
                        className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-bad)]"
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
      </Card>
    </div>
  )
}
