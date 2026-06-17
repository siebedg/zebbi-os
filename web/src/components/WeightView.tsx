import { useMemo, useState } from 'react'
import { format, parseISO, subDays, subMonths } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { WeightEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Btn, Card, Input } from './ui'

type RangeKey = '3m' | '6m' | '1y' | 'all'

const RANGES: { key: RangeKey; label: string; months?: number }[] = [
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1J', months: 12 },
  { key: 'all', label: 'Alles' },
]

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        line: '#34d399',
        fillTop: '#34d39955',
        fillBottom: '#34d39908',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        line: '#059669',
        fillTop: '#05966944',
        fillBottom: '#05966908',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
}

function formatKg(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

function deltaText(current: number, previous: number | null): { text: string; positive: boolean | null } {
  if (previous == null) return { text: '—', positive: null }
  const d = Math.round((current - previous) * 10) / 10
  if (d === 0) return { text: '0,0', positive: null }
  const sign = d > 0 ? '+' : ''
  return { text: `${sign}${d.toFixed(1).replace('.', ',')}`, positive: d > 0 }
}

function findEntryOnOrBefore(entries: WeightEntry[], target: string): WeightEntry | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].date <= target) return entries[i]
  }
  return null
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
  const [range, setRange] = useState<RangeKey>('6m')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [kg, setKg] = useState('')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)
    if (!r?.months || sorted.length === 0) return sorted
    const cutoff = format(subMonths(parseISO(sorted[sorted.length - 1].date), r.months), 'yyyy-MM-dd')
    return sorted.filter((e) => e.date >= cutoff)
  }, [sorted, range])

  const chartData = useMemo(
    () =>
      filtered.map((e) => ({
        label: format(parseISO(e.date), isMobile ? 'd/M' : 'd MMM', { locale: nl }),
        date: e.date,
        kg: e.kg,
      })),
    [filtered, isMobile],
  )

  const latest = sorted[sorted.length - 1]
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null

  const stats = useMemo(() => {
    if (!latest) return null
    const today = latest.date
    const weekAgo = findEntryOnOrBefore(sorted, format(subDays(parseISO(today), 7), 'yyyy-MM-dd'))
    const monthAgo = findEntryOnOrBefore(sorted, format(subMonths(parseISO(today), 1), 'yyyy-MM-dd'))
    const vals = filtered.map((e) => e.kg)
    return {
      latest: latest.kg,
      vsPrev: deltaText(latest.kg, previous?.kg ?? null),
      vsWeek: deltaText(latest.kg, weekAgo?.kg ?? null),
      vsMonth: deltaText(latest.kg, monthAgo?.kg ?? null),
      low: vals.length ? Math.min(...vals) : null,
      high: vals.length ? Math.max(...vals) : null,
    }
  }, [latest, previous, sorted, filtered])

  const domain = useMemo(() => {
    if (filtered.length === 0) return [60, 80]
    const vals = filtered.map((e) => e.kg)
    const pad = 0.8
    return [Math.floor((Math.min(...vals) - pad) * 10) / 10, Math.ceil((Math.max(...vals) + pad) * 10) / 10]
  }, [filtered])

  const add = () => {
    const w = parseFloat(kg.replace(',', '.'))
    if (!date || Number.isNaN(w)) return
    onUpsert({ date, kg: Math.round(w * 100) / 100 })
    setKg('')
    setAddOpen(false)
  }

  const DeltaPill = ({ label, delta }: { label: string; delta: { text: string; positive: boolean | null } }) => (
    <div className="rounded-xl bg-[var(--color-surface-overlay)] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          delta.positive === true
            ? 'text-[var(--color-bad)]'
            : delta.positive === false
              ? 'text-[var(--color-good)]'
              : 'text-[var(--color-text)]'
        }`}
      >
        {delta.text === '—' ? '—' : `${delta.text} kg`}
      </p>
    </div>
  )

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Hero — MacroFactor-style */}
      <div className="pt-1 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">Gewicht</p>
        {stats ? (
          <>
            <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-[var(--color-text)] sm:text-6xl">
              {formatKg(stats.latest)}
              <span className="ml-1 text-2xl font-normal text-[var(--color-muted)] sm:text-3xl">kg</span>
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {format(parseISO(latest.date), 'EEEE d MMMM yyyy', { locale: nl })}
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-muted)]">Nog geen metingen</p>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <DeltaPill label="vs vorige" delta={stats.vsPrev} />
          <DeltaPill label="7 dagen" delta={stats.vsWeek} />
          <DeltaPill label="30 dagen" delta={stats.vsMonth} />
        </div>
      )}

      {/* Range pills */}
      <div className="flex justify-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              range === r.key
                ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                : 'bg-[var(--color-surface-overlay)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <div className="h-56 w-full sm:h-64">
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
              Minstens 2 metingen in deze periode
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: isMobile ? 4 : 12, left: isMobile ? -16 : -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.fillTop} />
                    <stop offset="100%" stopColor={palette.fillBottom} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={palette.grid} strokeDasharray="0" vertical={false} />
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
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: palette.tooltipBg,
                    border: `1px solid ${palette.tooltipBorder}`,
                    borderRadius: 12,
                    fontSize: 13,
                    color: palette.tooltipText,
                    boxShadow: '0 4px 20px rgb(0 0 0 / 0.08)',
                  }}
                  labelFormatter={(_, payload) => {
                    const d = payload?.[0]?.payload?.date
                    return d ? format(parseISO(d), 'd MMM yyyy', { locale: nl }) : ''
                  }}
                  formatter={(v: number) => [`${formatKg(v)} kg`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="kg"
                  stroke={palette.line}
                  strokeWidth={2.5}
                  fill="url(#weightFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: palette.line, stroke: palette.tooltipBg, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        {stats?.low != null && stats.high != null && (
          <p className="text-center text-xs text-[var(--color-muted)]">
            Range {formatKg(stats.low)} – {formatKg(stats.high)} kg
          </p>
        )}
      </Card>

      {/* Add entry — compact */}
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--color-muted)]" />
            Meting toevoegen
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition ${addOpen ? 'rotate-180' : ''}`} />
        </button>
        {addOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-4">
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
                  placeholder="71,5"
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

      {/* History — collapsed by default */}
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span>
            Geschiedenis
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
