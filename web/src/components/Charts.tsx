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
  buildAllTimeOscillationReport,
  buildOscillationReport,
  collectMetricSeries,
  currentMonthKey,
  formatOscillationValue,
  monthEntries,
  type OscillationBand,
  type OscillationUnit,
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

type RangeKey = 'month' | 'all'

type CardModel = {
  band: OscillationBand
  /** Comparison baseline (prev month floor, or all-time floor). */
  compareLow: number | null
  /** Extra value shown in delta line (e.g. this month's floor in All mode). */
  compareValue: number | null
  compareHint: string | null
  series: { label: string; value: number }[]
  delta: number | null
  holdPct: number
  daysBelow: number
}

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

function formatDelta(delta: number, unit: OscillationUnit): string {
  const abs = Math.abs(delta)
  const signed = formatOscillationValue(abs, unit)
  return delta > 0 ? `+${signed}` : `−${signed}`
}

function floorStatus(
  delta: number | null,
  range: RangeKey,
): { label: string; tone: 'good' | 'bad' | 'muted' } {
  if (delta == null || delta === 0) {
    return {
      label: range === 'all' ? 'op all-time floor' : 'floor gelijk',
      tone: 'muted',
    }
  }
  if (range === 'all') {
    return delta > 0
      ? { label: 'deze maand boven all-time', tone: 'good' }
      : { label: 'deze maand onder all-time', tone: 'bad' }
  }
  if (delta > 0) return { label: 'floor omhoog', tone: 'good' }
  return { label: 'floor gezakt', tone: 'bad' }
}

function toneClass(tone: 'good' | 'bad' | 'muted') {
  if (tone === 'good') return 'text-[var(--color-good)]'
  if (tone === 'bad') return 'text-[var(--color-bad)]'
  return 'text-[var(--color-muted)]'
}

function seriesLabel(date: string, range: RangeKey): string {
  if (range === 'all') return format(parseISO(date), 'd MMM')
  return format(parseISO(date), 'd/M')
}

function BaselineCard({ card, range }: { card: CardModel; range: RangeKey }) {
  const { band, compareLow, compareValue, compareHint, series, delta, holdPct, daysBelow } = card
  const { theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const palette = chartPalette(theme)
  const status = floorStatus(delta, range)

  const chartData = series.map((p) => ({ ...p }))
  const vals = series.map((p) => p.value)
  const yMin = Math.min(...vals, band.low ?? Infinity)
  const yMax = Math.max(...vals, band.high ?? -Infinity, band.low ?? 0)
  const pad = Math.max((yMax - yMin) * 0.15, band.metric.unit === '%' ? 2 : 0.5)
  const domain: [number, number] = [
    Math.floor((yMin - pad) * 10) / 10,
    Math.ceil((yMax + pad) * 10) / 10,
  ]

  const deltaDetail =
    range === 'all' && compareValue != null
      ? `deze maand ${formatOscillationValue(compareValue, band.metric.unit)}`
      : compareLow != null
        ? `${compareHint ?? 'was'} ${formatOscillationValue(compareLow, band.metric.unit)}`
        : null

  return (
    <article className="flex flex-col border-b border-[var(--color-border)] py-6 last:border-b-0 sm:border sm:border-[var(--color-border)] sm:rounded-xl sm:px-5 sm:py-5 sm:last:border-b">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{band.metric.label}</h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {daysBelow === 0
              ? `Elke dag ≥ floor (${series.length})`
              : `${daysBelow}× onder floor · ${holdPct}% gehouden`}
          </p>
        </div>
        <div className={`text-right text-xs font-medium tabular-nums ${toneClass(status.tone)}`}>
          <p>{status.label}</p>
          {delta != null && delta !== 0 && (
            <p className="mt-0.5 opacity-90">
              {formatDelta(delta, band.metric.unit)}
              {deltaDetail ? ` (${deltaDetail})` : ''}
            </p>
          )}
        </div>
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
                minTickGap={range === 'all' ? 40 : 28}
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
    </article>
  )
}

export function Charts({ entries }: { entries: DailyEntry[] }) {
  const [range, setRange] = useState<RangeKey>('month')
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())

  const monthReport = useMemo(
    () => buildOscillationReport(entries, monthKey),
    [entries, monthKey],
  )
  const prevKey = useMemo(
    () => format(subMonths(parseISO(`${monthKey}-01`), 1), 'yyyy-MM'),
    [monthKey],
  )
  const prevReport = useMemo(() => buildOscillationReport(entries, prevKey), [entries, prevKey])
  const allReport = useMemo(() => buildAllTimeOscillationReport(entries), [entries])
  const inMonth = useMemo(() => monthEntries(entries, monthKey), [entries, monthKey])

  const cards = useMemo(() => {
    const built: CardModel[] = []

    if (range === 'month') {
      const prevMap = new Map(prevReport.bands.map((b) => [b.metric.id, b.low]))
      for (const id of CHART_METRIC_IDS) {
        const band = monthReport.bands.find((b) => b.metric.id === id)
        if (!band || band.low == null) continue
        const metric = OSCILLATION_METRICS.find((m) => m.id === id)!
        const series = collectMetricSeries(inMonth, id).map((p) => ({
          label: seriesLabel(p.date, 'month'),
          value: p.value,
        }))
        const prevLow = prevMap.get(id) ?? null
        const delta =
          prevLow != null ? Math.round((band.low - prevLow) * 10) / 10 : null
        const daysBelow = series.filter((p) => p.value < band.low!).length
        const holdPct =
          series.length > 0
            ? Math.round(((series.length - daysBelow) / series.length) * 100)
            : 0

        built.push({
          band: { ...band, metric },
          compareLow: prevLow,
          compareValue: null,
          compareHint: 'was',
          series,
          delta,
          holdPct,
          daysBelow,
        })
      }
    } else {
      const monthMap = new Map(monthReport.bands.map((b) => [b.metric.id, b.low]))
      for (const id of CHART_METRIC_IDS) {
        const band = allReport.bands.find((b) => b.metric.id === id)
        if (!band || band.low == null) continue
        const metric = OSCILLATION_METRICS.find((m) => m.id === id)!
        const series = collectMetricSeries(entries, id).map((p) => ({
          label: seriesLabel(p.date, 'all'),
          value: p.value,
        }))
        const monthLow = monthMap.get(id) ?? null
        // Delta = this month's floor vs all-time floor
        const delta =
          monthLow != null ? Math.round((monthLow - band.low) * 10) / 10 : null
        const daysBelow = series.filter((p) => p.value < band.low!).length
        const holdPct =
          series.length > 0
            ? Math.round(((series.length - daysBelow) / series.length) * 100)
            : 0

        built.push({
          band: { ...band, metric },
          compareLow: band.low,
          compareValue: monthLow,
          compareHint: 'all-time',
          series,
          delta,
          holdPct,
          daysBelow,
        })
      }
    }

    return built.sort((a, b) => {
      const aSlip = a.delta != null && a.delta < 0 ? 1 : 0
      const bSlip = b.delta != null && b.delta < 0 ? 1 : 0
      if (aSlip !== bSlip) return bSlip - aSlip
      if (a.daysBelow !== b.daysBelow) return b.daysBelow - a.daysBelow
      const aRise = a.delta != null && a.delta > 0 ? 1 : 0
      const bRise = b.delta != null && b.delta > 0 ? 1 : 0
      if (aRise !== bRise) return aRise - bRise
      return (a.delta ?? 0) - (b.delta ?? 0)
    })
  }, [range, monthReport.bands, prevReport.bands, allReport.bands, inMonth, entries])

  const slipped = cards.filter((c) => c.delta != null && c.delta < 0)
  const rising = cards.filter((c) => c.delta != null && c.delta > 0)
  const priority = slipped[0] ?? cards.find((c) => c.daysBelow > 0) ?? null

  const shiftMonth = (delta: number) => {
    const d =
      delta < 0
        ? subMonths(parseISO(`${monthKey}-01`), 1)
        : addMonths(parseISO(`${monthKey}-01`), 1)
    setMonthKey(format(d, 'yyyy-MM'))
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <header className="mb-6 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Baselines
        </p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-[var(--color-text)] sm:text-4xl">
          Raise the floor
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Verbeteren = je herhalende low omhoog. Piek is nice; floor is progress.
        </p>
      </header>

      <div className="mb-6 flex justify-center gap-1">
        {(
          [
            { key: 'month' as const, label: 'Maand' },
            { key: 'all' as const, label: 'All' },
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

      {range === 'month' && (
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
            {monthReport.label}
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
      )}

      {range === 'all' && (
        <p className="mb-8 text-center text-[13px] text-[var(--color-muted)]">
          All time · floor vs deze maand ({monthReport.label})
        </p>
      )}

      {priority && (
        <section className="mb-8 rounded-xl border border-[var(--color-border)] px-4 py-4 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Eerst dit
          </p>
          <p className="mt-1.5 text-base font-semibold text-[var(--color-text)]">
            {priority.band.metric.label}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {range === 'all' && priority.delta != null && priority.delta < 0 ? (
              <>
                Deze maand floor onder all-time ({priority.band.displayLow}). Til terug naar of
                boven je lifetime floor.
              </>
            ) : priority.delta != null && priority.delta < 0 ? (
              <>
                Floor gezakt naar {priority.band.displayLow}
                {priority.compareLow != null && (
                  <>
                    {' '}
                    (was {formatOscillationValue(priority.compareLow, priority.band.metric.unit)})
                  </>
                )}
                . Herstel dit niveau voor je iets nieuws jaagt.
              </>
            ) : priority.daysBelow > 0 ? (
              <>
                {priority.daysBelow} dagen onder floor ({priority.band.displayLow}). Houd dit
                niveau vast — geen dips.
              </>
            ) : (
              <>
                Floor staat op {priority.band.displayLow}. Til dit op door vaker boven je huidige
                low te zitten.
              </>
            )}
          </p>
          {(slipped.length > 0 || rising.length > 0) && (
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {slipped.length > 0 && (
                <span className="text-[var(--color-bad)]">
                  {range === 'all' ? 'Onder all-time: ' : 'Gezakt: '}
                  {slipped.map((c) => c.band.metric.label).join(', ')}
                </span>
              )}
              {slipped.length > 0 && rising.length > 0 && (
                <span className="mx-1.5 opacity-40">·</span>
              )}
              {rising.length > 0 && (
                <span className="text-[var(--color-good)]">
                  {range === 'all' ? 'Boven all-time: ' : 'Omhoog: '}
                  {rising.map((c) => c.band.metric.label).join(', ')}
                </span>
              )}
            </p>
          )}
        </section>
      )}

      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data voor baselines.
        </p>
      ) : (
        <div className="sm:space-y-4">
          {cards.map((card) => (
            <BaselineCard key={card.band.metric.id} card={card} range={range} />
          ))}
        </div>
      )}
    </div>
  )
}
