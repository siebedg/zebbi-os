import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import {
  OSCILLATION_METRICS,
  buildOscillationReport,
  currentMonthKey,
} from '../lib/oscillation'

const UP = '#5eead4'
const DOWN = '#f9a8d4'
const MID = '#7dd3c0'

/** Fixed decorative sine — always the same shape; data only fills high/low labels. */
function FixedOscillationWave({
  displayLow,
  displayHigh,
}: {
  displayLow: string
  displayHigh: string
}) {
  const w = 960
  const h = 420
  const padL = 36
  const padR = 36
  const padT = 96
  const padB = 48
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const midY = padT + plotH / 2
  const amp = plotH * 0.4

  const cycles = 2
  const steps = 160
  const pts: { x: number; y: number; phase: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const phase = t * cycles * Math.PI * 2
    const x = padL + t * plotW
    const y = midY - Math.sin(phase) * amp
    pts.push({ x, y, phase })
  }

  const peak = pts.reduce((best, p) => (p.y < best.y ? p : best), pts[0])
  const firstPeak =
    pts.find((p) => p.phase >= Math.PI / 2 - 0.06 && p.phase <= Math.PI / 2 + 0.06) ?? peak
  const firstTrough =
    pts.find((p) => p.phase >= (3 * Math.PI) / 2 - 0.06 && p.phase <= (3 * Math.PI) / 2 + 0.06) ??
    pts.reduce((best, p) => (p.y > best.y ? p : best), pts[0])

  const segments: { d: string; up: boolean }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const cx = (a.x + b.x) / 2
    segments.push({
      d: `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} C ${cx.toFixed(2)} ${a.y.toFixed(2)}, ${cx.toFixed(2)} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
      up: b.y <= a.y,
    })
  }

  const boxW = 132
  const boxH = 52
  const boxHighX = Math.min(Math.max(firstPeak.x - boxW / 2, 20), w - boxW - 20)
  const boxLowX = Math.min(Math.max(firstTrough.x - boxW / 2, 20), w - boxW - 20)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Oscillation">
      <rect x={padL} y={padT} width={plotW} height={plotH} fill="#ececee" />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = padL + ((i + 1) / 15) * plotW
        return <line key={i} x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#d4d4d8" strokeWidth={1} />
      })}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#3f3f46" strokeWidth={2} />

      <line
        x1={padL}
        y1={midY}
        x2={padL + plotW}
        y2={midY}
        stroke={MID}
        strokeWidth={2}
        strokeDasharray="8 7"
      />

      {segments.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill="none"
          stroke={s.up ? UP : DOWN}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      <line
        x1={firstPeak.x}
        y1={firstPeak.y}
        x2={boxHighX + boxW / 2}
        y2={padT - 12}
        stroke="#18181b"
        strokeWidth={1.25}
      />
      <rect x={boxHighX} y={10} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.75} />
      <text x={boxHighX + boxW / 2} y={30} textAnchor="middle" fontSize={12} fill="#71717a">
        High point
      </text>
      <text x={boxHighX + boxW / 2} y={50} textAnchor="middle" fontSize={17} fontWeight={600} fill="#18181b">
        {displayHigh}
      </text>

      <line
        x1={firstTrough.x}
        y1={firstTrough.y}
        x2={boxLowX + boxW / 2}
        y2={padT - 12}
        stroke="#18181b"
        strokeWidth={1.25}
      />
      <rect x={boxLowX} y={10} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.75} />
      <text x={boxLowX + boxW / 2} y={30} textAnchor="middle" fontSize={12} fill="#71717a">
        Low point
      </text>
      <text x={boxLowX + boxW / 2} y={50} textAnchor="middle" fontSize={17} fontWeight={600} fill="#18181b">
        {displayLow}
      </text>
    </svg>
  )
}

export function TrendView({ entries }: { entries: DailyEntry[] }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())
  const [metricId, setMetricId] = useState('meditation')

  const report = useMemo(() => buildOscillationReport(entries, monthKey), [entries, monthKey])

  const available = useMemo(() => {
    const ids = new Set(report.bands.map((b) => b.metric.id))
    return OSCILLATION_METRICS.filter((m) => ids.has(m.id))
  }, [report.bands])

  const activeId = available.some((m) => m.id === metricId) ? metricId : available[0]?.id ?? 'meditation'
  const band = report.bands.find((b) => b.metric.id === activeId)

  const shiftMonth = (delta: number) => {
    const d = delta < 0 ? subMonths(parseISO(`${monthKey}-01`), 1) : addMonths(parseISO(`${monthKey}-01`), 1)
    setMonthKey(format(d, 'yyyy-MM'))
  }

  const metricLabel = band?.metric.label.toLowerCase() ?? '…'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Vorige maand"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-[8rem] text-center text-sm capitalize text-[var(--color-muted)]">
          {report.label}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Volgende maand"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div>
        <h2 className="font-serif text-2xl tracking-tight text-[var(--color-text)] sm:text-3xl">
          Oscillation of my {metricLabel}
        </h2>

        {available.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {available.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricId(m.id)}
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  m.id === activeId
                    ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!band || band.low == null || band.high == null ? (
        <p className="py-20 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data voor high/low van deze maand.
        </p>
      ) : (
        <FixedOscillationWave displayLow={band.displayLow} displayHigh={band.displayHigh} />
      )}
    </div>
  )
}
