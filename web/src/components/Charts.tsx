import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '../types'
import {
  OSCILLATION_METRICS,
  buildOscillationReport,
  collectMetricSeries,
  currentMonthKey,
  formatOscillationValue,
  monthEntries,
  type OscillationBand,
} from '../lib/oscillation'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'

/** Metrics that matter for raising your floor — same set as oscillation, minus noise. */
const CHART_METRIC_IDS = [
  'meditation',
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'totalWorked',
  'avgFocus',
  'sleepScore',
  'timetable',
] as const

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        line: '#a1a1aa',
        floor: '#2dd4bf',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        line: '#52525b',
        floor: '#0d9488',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
}

function floorDelta(
  current: number | null,
  prev: number | null,
): { text: string; better: boolean | null } {
  if (current == null || prev == null) return { text: '—', better: null }
  const d = Math.round((current - prev) * 10) / 10
  if (d === 0) return { text: 'floor gelijk', better: null }
  const better = d > 0
  const sign = d > 0 ? '+' : ''
  return { text: `floor ${sign}${d}`, better }
}

function BaselineCard({
  band,
  prevLow,
  series,
}: {
  band: OscillationBand
  prevLow: number | null
  series: { label: string; value: number }[]
}) {
  const { theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const palette = chartPalette(theme)
  const delta = floorDelta(band.low, prevLow)

  const chartData = series.map((p) => ({ ...p }))
  const vals = series.map((p) => p.value)
  const yMin = Math.min(...vals, band.low ?? Infinity)
  const yMax = Math.max(...vals, band.high ?? -Infinity, band.low ?? 0)
  const pad = Math.max((yMax - yMin) * 0.15, band.metric.unit === '%' ? 2 : 0.5)
  const domain: [number, number] = [
    Math.floor((yMin - pad) * 10) / 10,
    Math.ceil((yMax + pad) * 10) / 10,
  ]

  const daysAtOrAboveFloor =
    band.low != null ? series.filter((p) => p.value >= band.low!).length : 0
  const holdPct =
    series.length > 0 ? Math.round((daysAtOrAboveFloor / series.length) * 100) : 0

  return (
    <article className="flex flex-col border-b border-[var(--color-border)] py-6 last:border-b-0 sm:border sm:border-[var(--color-border)] sm:rounded-xl sm:px-5 sm:py-5 sm:last:border-b">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{band.metric.label}</h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {holdPct}% van dagen ≥ floor · {band.samples} samples
          </p>
        </div>
        <p
          className={`text-xs font-medium tabular-nums ${
            delta.better === true
              ? 'text-[var(--color-good)]'
              : delta.better === false
                ? 'text-[var(--color-bad)]'
                : 'text-[var(--color-muted)]'
          }`}
        >
          {delta.text}
          {delta.better != null ? ' vs vorige maand' : ''}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Floor
          </p>
          <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums text-[var(--color-text)]">
            {band.displayLow}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
            High
          </p>
          <p className="mt-0.5 text-lg font-medium tabular-nums text-[var(--color-muted)]">
            {band.displayHigh}
          </p>
        </div>
      </div>

      {chartData.length >= 2 && band.low != null && (
        <div className="mt-4 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 6, right: 4, left: isMobile ? -18 : -8, bottom: 0 }}
            >
              <CartesianGrid stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: palette.tick, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={domain}
                tick={{ fill: palette.tick, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 28 : 34}
                tickFormatter={(v) =>
                  band.metric.unit === 'min' && v >= 60
                    ? `${Math.round(v / 60)}u`
                    : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  background: palette.tooltipBg,
                  border: `1px solid ${palette.tooltipBorder}`,
                  borderRadius: 10,
                  fontSize: 12,
                  color: palette.tooltipText,
                }}
                formatter={(v: number) => [
                  formatOscillationValue(v, band.metric.unit),
                  band.metric.label,
                ]}
              />
              <ReferenceLine
                y={band.low}
                stroke={palette.floor}
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={palette.line}
                strokeWidth={1.75}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
        Teal streep = je floor. Til die op — dat is je baseline.
      </p>
    </article>
  )
}

export function Charts({ entries }: { entries: DailyEntry[] }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())

  const report = useMemo(() => buildOscillationReport(entries, monthKey), [entries, monthKey])
  const prevKey = useMemo(
    () => format(subMonths(parseISO(`${monthKey}-01`), 1), 'yyyy-MM'),
    [monthKey],
  )
  const prevReport = useMemo(() => buildOscillationReport(entries, prevKey), [entries, prevKey])

  const inMonth = useMemo(() => monthEntries(entries, monthKey), [entries, monthKey])

  const cards = useMemo(() => {
    const prevMap = new Map(prevReport.bands.map((b) => [b.metric.id, b.low]))
    return CHART_METRIC_IDS.map((id) => {
      const band = report.bands.find((b) => b.metric.id === id)
      if (!band || band.low == null) return null
      const metric = OSCILLATION_METRICS.find((m) => m.id === id)!
      const series = collectMetricSeries(inMonth, id).map((p) => ({
        label: p.label,
        value: p.value,
      }))
      return {
        band: { ...band, metric },
        prevLow: prevMap.get(id) ?? null,
        series,
      }
    }).filter(Boolean) as {
      band: OscillationBand
      prevLow: number | null
      series: { label: string; value: number }[]
    }[]
  }, [report.bands, prevReport.bands, inMonth])

  const shiftMonth = (delta: number) => {
    const d =
      delta < 0 ? subMonths(parseISO(`${monthKey}-01`), 1) : addMonths(parseISO(`${monthKey}-01`), 1)
    setMonthKey(format(d, 'yyyy-MM'))
  }

  const rising = cards.filter((c) => c.prevLow != null && c.band.low != null && c.band.low! > c.prevLow)
  const slipping = cards.filter(
    (c) => c.prevLow != null && c.band.low != null && c.band.low! < c.prevLow,
  )

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="mb-8 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
          aria-label="Vorige maand"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9.5rem] text-center text-[13px] capitalize tracking-wide text-[var(--color-muted)]">
          {report.label}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
          aria-label="Volgende maand"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <header className="mb-8 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Baselines
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--color-text)] sm:text-4xl">
          Raise the floor
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
          Elke kaart toont je herhalende low (floor). Verbeteren = die floor omhoog, niet één keer een
          piek jagen.
        </p>
        {(rising.length > 0 || slipping.length > 0) && (
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {rising.length > 0 && (
              <span className="text-[var(--color-good)]">{rising.length} floor↑</span>
            )}
            {rising.length > 0 && slipping.length > 0 && <span className="mx-1.5 opacity-40">·</span>}
            {slipping.length > 0 && (
              <span className="text-[var(--color-bad)]">{slipping.length} floor↓</span>
            )}
            <span className="opacity-60"> vs vorige maand</span>
          </p>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data deze maand voor baselines.
        </p>
      ) : (
        <div className="sm:space-y-4">
          {cards.map(({ band, prevLow, series }) => (
            <BaselineCard key={band.metric.id} band={band} prevLow={prevLow} series={series} />
          ))}
        </div>
      )}
    </div>
  )
}
