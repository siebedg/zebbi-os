import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import {
  OSCILLATION_METRICS,
  buildOscillationReport,
  collectMetricSeries,
  currentMonthKey,
  monthEntries,
  type OscillationBand,
  type OscillationPoint,
} from '../lib/oscillation'
import { useTheme } from '../hooks/useTheme'
import { Card } from './ui'

const UP = '#5eead4'
const DOWN = '#f9a8d4'
const MID = '#99f6e4'

function OscillationWave({
  points,
  low,
  high,
  displayLow,
  displayHigh,
}: {
  points: OscillationPoint[]
  low: number | null
  high: number | null
  displayLow: string
  displayHigh: string
}) {
  const { theme } = useTheme()
  const w = 640
  const h = 220
  const padL = 12
  const padR = 12
  const padT = 56
  const padB = 28
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  if (points.length < 2 || low == null || high == null) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-[var(--color-muted)]">
        Te weinig punten voor een golf
      </div>
    )
  }

  const vals = points.map((p) => p.value)
  const dataMin = Math.min(...vals, low)
  const dataMax = Math.max(...vals, high)
  const span = Math.max(dataMax - dataMin, 0.001)
  const yMin = dataMin - span * 0.12
  const yMax = dataMax + span * 0.12
  const ySpan = yMax - yMin

  const xy = points.map((p, i) => {
    const x = padL + (i / (points.length - 1)) * plotW
    const y = padT + (1 - (p.value - yMin) / ySpan) * plotH
    return { x, y, ...p }
  })

  const midY = padT + (1 - ((low + high) / 2 - yMin) / ySpan) * plotH
  const lowY = padT + (1 - (low - yMin) / ySpan) * plotH
  const highY = padT + (1 - (high - yMin) / ySpan) * plotH

  // First clear peak / trough near established high/low for callout anchors
  let peakIdx = 0
  let troughIdx = 0
  let peakScore = -Infinity
  let troughScore = Infinity
  xy.forEach((p, i) => {
    if (p.value >= peakScore) {
      peakScore = p.value
      peakIdx = i
    }
    if (p.value <= troughScore) {
      troughScore = p.value
      troughIdx = i
    }
  })
  // Prefer points close to established high/low
  const nearHigh = xy
    .map((p, i) => ({ i, d: Math.abs(p.value - high) }))
    .sort((a, b) => a.d - b.d)[0]
  const nearLow = xy
    .map((p, i) => ({ i, d: Math.abs(p.value - low) }))
    .sort((a, b) => a.d - b.d)[0]
  if (nearHigh) peakIdx = nearHigh.i
  if (nearLow) troughIdx = nearLow.i

  const peak = xy[peakIdx]
  const trough = xy[troughIdx]

  const grid = theme === 'dark' ? '#3f3f46' : '#e4e4e7'
  const axis = theme === 'dark' ? '#a1a1aa' : '#3f3f46'
  const boxStroke = theme === 'dark' ? '#a1a1aa' : '#18181b'
  const boxFill = theme === 'dark' ? '#18181b' : '#ffffff'
  const chartBg = theme === 'dark' ? '#27272a' : '#f4f4f5'

  const segments: { d: string; up: boolean }[] = []
  for (let i = 0; i < xy.length - 1; i++) {
    const a = xy[i]
    const b = xy[i + 1]
    const cx = (a.x + b.x) / 2
    segments.push({
      d: `M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`,
      up: b.value >= a.value,
    })
  }

  // Keep callout boxes from overlapping
  let boxHighX = Math.min(Math.max(peak.x - 48, 8), w - 120)
  let boxLowX = Math.min(Math.max(trough.x - 48, 8), w - 120)
  if (Math.abs(boxHighX - boxLowX) < 110) {
    if (boxHighX <= boxLowX) {
      boxHighX = Math.max(8, boxLowX - 118)
    } else {
      boxLowX = Math.min(w - 120, boxHighX + 118)
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Oscillation wave">
      <rect x={padL} y={padT} width={plotW} height={plotH} fill={chartBg} rx={2} />
      {Array.from({ length: 8 }).map((_, i) => {
        const x = padL + ((i + 1) / 9) * plotW
        return <line key={i} x1={x} y1={padT} x2={x} y2={padT + plotH} stroke={grid} strokeWidth={1} />
      })}
      <line
        x1={padL}
        y1={midY}
        x2={padL + plotW}
        y2={midY}
        stroke={MID}
        strokeWidth={1.5}
        strokeDasharray="6 5"
        opacity={0.9}
      />
      <line
        x1={padL}
        y1={padT + plotH}
        x2={padL + plotW}
        y2={padT + plotH}
        stroke={axis}
        strokeWidth={2}
      />

      {segments.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={s.up ? UP : DOWN}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}

      {/* High callout */}
      <line x1={peak.x} y1={peak.y} x2={boxHighX + 48} y2={42} stroke={boxStroke} strokeWidth={1} />
      <rect x={boxHighX} y={8} width={96} height={34} fill={boxFill} stroke={boxStroke} strokeWidth={1.5} rx={2} />
      <text x={boxHighX + 48} y={22} textAnchor="middle" fontSize={9} fill={axis}>
        High
      </text>
      <text x={boxHighX + 48} y={35} textAnchor="middle" fontSize={12} fontWeight={600} fill={theme === 'dark' ? '#fafafa' : '#18181b'}>
        {displayHigh}
      </text>
      <circle cx={peak.x} cy={peak.y} r={4} fill={UP} stroke={boxFill} strokeWidth={2} />

      {/* Low callout */}
      <line x1={trough.x} y1={trough.y} x2={boxLowX + 48} y2={42} stroke={boxStroke} strokeWidth={1} />
      <rect x={boxLowX} y={8} width={96} height={34} fill={boxFill} stroke={boxStroke} strokeWidth={1.5} rx={2} />
      <text x={boxLowX + 48} y={22} textAnchor="middle" fontSize={9} fill={axis}>
        Low
      </text>
      <text x={boxLowX + 48} y={35} textAnchor="middle" fontSize={12} fontWeight={600} fill={theme === 'dark' ? '#fafafa' : '#18181b'}>
        {displayLow}
      </text>
      <circle cx={trough.x} cy={trough.y} r={4} fill={DOWN} stroke={boxFill} strokeWidth={2} />

      {/* Subtle low/high guides */}
      <line x1={padL} y1={lowY} x2={padL + plotW} y2={lowY} stroke={DOWN} strokeWidth={1} strokeDasharray="2 4" opacity={0.35} />
      <line x1={padL} y1={highY} x2={padL + plotW} y2={highY} stroke={UP} strokeWidth={1} strokeDasharray="2 4" opacity={0.35} />
    </svg>
  )
}

function OscillationSheet({
  band,
  points,
}: {
  band: OscillationBand
  points: OscillationPoint[]
}) {
  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <h3 className="mb-3 text-base font-medium tracking-tight text-[var(--color-text)] sm:text-lg">
        Oscillation of my{' '}
        <span className="border-b border-[var(--color-text)] font-semibold">{band.metric.label.toLowerCase()}</span>
      </h3>
      <OscillationWave
        points={points}
        low={band.low}
        high={band.high}
        displayLow={band.displayLow}
        displayHigh={band.displayHigh}
      />
      <p className="mt-2 text-[11px] text-[var(--color-muted)]">
        <span className="inline-block h-0.5 w-4 align-middle" style={{ background: UP }} /> omhoog
        {' · '}
        <span className="inline-block h-0.5 w-4 align-middle" style={{ background: DOWN }} /> omlaag
        {' · '}
        dashed = midden van je band
        {band.hint ? ` · ${band.hint}` : ''}
      </p>
    </Card>
  )
}

export function TrendView({ entries }: { entries: DailyEntry[] }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())
  const [metricId, setMetricId] = useState('meditation')

  const report = useMemo(() => buildOscillationReport(entries, monthKey), [entries, monthKey])
  const inMonth = useMemo(() => monthEntries(entries, monthKey), [entries, monthKey])

  const available = useMemo(() => {
    const ids = new Set(report.bands.map((b) => b.metric.id))
    return OSCILLATION_METRICS.filter((m) => ids.has(m.id))
  }, [report.bands])

  const activeId = available.some((m) => m.id === metricId) ? metricId : available[0]?.id ?? 'meditation'
  const band = report.bands.find((b) => b.metric.id === activeId)
  const series = useMemo(
    () => (activeId ? collectMetricSeries(inMonth, activeId) : []),
    [inMonth, activeId],
  )

  const shiftMonth = (delta: number) => {
    const d = delta < 0 ? subMonths(parseISO(`${monthKey}-01`), 1) : addMonths(parseISO(`${monthKey}-01`), 1)
    setMonthKey(format(d, 'yyyy-MM'))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)]"
            aria-label="Vorige maand"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium capitalize text-[var(--color-text)]">
            {report.label}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)]"
            aria-label="Volgende maand"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          {report.daysWithData}/{report.daysInMonth} dagen · low = absolute floor
        </p>
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetricId(m.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                m.id === activeId
                  ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                  : 'bg-[var(--color-surface-overlay)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {!band ? (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data in deze maand voor oscillation.
        </Card>
      ) : (
        <OscillationSheet band={band} points={series} />
      )}

      {report.bands.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {report.bands.map((b) => (
            <button
              key={b.metric.id}
              type="button"
              onClick={() => setMetricId(b.metric.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                b.metric.id === activeId
                  ? 'border-[var(--color-text)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
              }`}
            >
              <p className="text-[11px] text-[var(--color-muted)]">{b.metric.label}</p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-[var(--color-text)]">
                {b.displayLow}
                <span className="font-normal text-[var(--color-muted)]"> → </span>
                {b.displayHigh}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
