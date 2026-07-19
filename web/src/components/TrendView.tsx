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
  type OscillationPoint,
} from '../lib/oscillation'

const UP = '#5eead4'
const DOWN = '#f9a8d4'
const MID = '#7dd3c0'

function OscillationWave({
  points,
  low,
  high,
  displayLow,
  displayHigh,
}: {
  points: OscillationPoint[]
  low: number
  high: number
  displayLow: string
  displayHigh: string
}) {
  const w = 720
  const h = 280
  const padL = 24
  const padR = 24
  const padT = 72
  const padB = 36
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const vals = points.map((p) => p.value)
  const dataMin = Math.min(...vals, low)
  const dataMax = Math.max(...vals, high)
  const span = Math.max(dataMax - dataMin, 0.001)
  const yMin = dataMin - span * 0.18
  const yMax = dataMax + span * 0.18
  const ySpan = yMax - yMin

  const xy = points.map((p, i) => {
    const x = padL + (i / Math.max(points.length - 1, 1)) * plotW
    const y = padT + (1 - (p.value - yMin) / ySpan) * plotH
    return { x, y, value: p.value }
  })

  const midY = padT + (1 - ((low + high) / 2 - yMin) / ySpan) * plotH

  const nearHigh = [...xy]
    .map((p, i) => ({ i, d: Math.abs(p.value - high) }))
    .sort((a, b) => a.d - b.d)[0]
  const nearLow = [...xy]
    .map((p, i) => ({ i, d: Math.abs(p.value - low) }))
    .sort((a, b) => a.d - b.d)[0]

  const peak = xy[nearHigh?.i ?? 0]
  const trough = xy[nearLow?.i ?? 0]

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

  const boxW = 108
  const boxH = 40
  let boxHighX = Math.min(Math.max(peak.x - boxW / 2, 12), w - boxW - 12)
  let boxLowX = Math.min(Math.max(trough.x - boxW / 2, 12), w - boxW - 12)
  if (Math.abs(boxHighX - boxLowX) < boxW + 16) {
    if (peak.x <= trough.x) {
      boxHighX = Math.max(12, boxLowX - boxW - 16)
      if (boxHighX < 12) {
        boxHighX = 12
        boxLowX = Math.min(w - boxW - 12, boxHighX + boxW + 16)
      }
    } else {
      boxLowX = Math.max(12, boxHighX - boxW - 16)
      if (boxLowX < 12) {
        boxLowX = 12
        boxHighX = Math.min(w - boxW - 12, boxLowX + boxW + 16)
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Oscillation">
      {/* Chart plane */}
      <rect x={padL} y={padT} width={plotW} height={plotH} fill="#ececee" />
      {Array.from({ length: 10 }).map((_, i) => {
        const x = padL + ((i + 1) / 11) * plotW
        return <line key={i} x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#d4d4d8" strokeWidth={1} />
      })}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#3f3f46" strokeWidth={1.5} />

      {/* Midline */}
      <line
        x1={padL}
        y1={midY}
        x2={padL + plotW}
        y2={midY}
        stroke={MID}
        strokeWidth={1.5}
        strokeDasharray="7 6"
      />

      {/* Wave */}
      {segments.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={s.up ? UP : DOWN}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* High point callout */}
      <line
        x1={peak.x}
        y1={peak.y}
        x2={boxHighX + boxW / 2}
        y2={padT - 8}
        stroke="#18181b"
        strokeWidth={1}
      />
      <rect x={boxHighX} y={10} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.5} />
      <text x={boxHighX + boxW / 2} y={26} textAnchor="middle" fontSize={10} fill="#71717a">
        High point
      </text>
      <text
        x={boxHighX + boxW / 2}
        y={42}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="#18181b"
      >
        {displayHigh}
      </text>

      {/* Low point callout */}
      <line
        x1={trough.x}
        y1={trough.y}
        x2={boxLowX + boxW / 2}
        y2={padT - 8}
        stroke="#18181b"
        strokeWidth={1}
      />
      <rect x={boxLowX} y={10} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.5} />
      <text x={boxLowX + boxW / 2} y={26} textAnchor="middle" fontSize={10} fill="#71717a">
        Low point
      </text>
      <text
        x={boxLowX + boxW / 2}
        y={42}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="#18181b"
      >
        {displayLow}
      </text>
    </svg>
  )
}

export function TrendView({ entries }: { entries: DailyEntry[] }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())
  const [metricId, setMetricId] = useState('meditation')

  const report = useMemo(() => buildOscillationReport(entries, monthKey), [entries, monthKey])
  const inMonth = useMemo(() => monthEntries(entries, monthKey), [entries, monthKey])

  const available = useMemo(() => {
    const ids = new Set(report.bands.filter((b) => b.low != null && b.high != null).map((b) => b.metric.id))
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

  const metricLabel = band?.metric.label.toLowerCase() ?? '…'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Vorige maand"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[7rem] text-center text-xs capitalize text-[var(--color-muted)]">
          {report.label}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Volgende maand"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div>
        <h2 className="mb-1 font-serif text-xl tracking-tight text-[var(--color-text)] sm:text-2xl">
          Oscillation of my{' '}
          <span className="inline-block min-w-[8rem] border-b-2 border-[var(--color-text)] pb-0.5 font-semibold">
            {metricLabel}
          </span>
        </h2>

        {available.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {available.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricId(m.id)}
                className={`rounded px-2 py-1 text-[11px] transition ${
                  m.id === activeId
                    ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!band || band.low == null || band.high == null || series.length < 2 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data voor deze maand.
        </p>
      ) : (
        <OscillationWave
          points={series}
          low={band.low}
          high={band.high}
          displayLow={band.displayLow}
          displayHigh={band.displayHigh}
        />
      )}
    </div>
  )
}
