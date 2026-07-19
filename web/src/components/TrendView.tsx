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
  const w = 720
  const h = 300
  const padL = 28
  const padR = 28
  const padT = 78
  const padB = 40
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const midY = padT + plotH / 2
  const amp = plotH * 0.38

  // Two full cycles, matching the sketch
  const cycles = 2
  const steps = 120
  const pts: { x: number; y: number; phase: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const phase = t * cycles * Math.PI * 2
    const x = padL + t * plotW
    // Start mid-rise so first peak & trough land cleanly (like the photo)
    const y = midY - Math.sin(phase) * amp
    pts.push({ x, y, phase })
  }

  // Peak = first crest (phase ≈ π/2), trough = first valley (phase ≈ 3π/2)
  const peak = pts.reduce((best, p) => (p.y < best.y ? p : best), pts[0])
  // Prefer the first-cycle peak/trough for callout placement
  const firstPeak = pts.find((p) => p.phase >= Math.PI / 2 - 0.08 && p.phase <= Math.PI / 2 + 0.08) ?? peak
  const firstTrough =
    pts.find((p) => p.phase >= (3 * Math.PI) / 2 - 0.08 && p.phase <= (3 * Math.PI) / 2 + 0.08) ??
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

  const boxW = 112
  const boxH = 42
  const boxHighX = Math.min(Math.max(firstPeak.x - boxW / 2, 16), w - boxW - 16)
  const boxLowX = Math.min(Math.max(firstTrough.x - boxW / 2, 16), w - boxW - 16)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Oscillation">
      <rect x={padL} y={padT} width={plotW} height={plotH} fill="#ececee" />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = padL + ((i + 1) / 12) * plotW
        return <line key={i} x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#d4d4d8" strokeWidth={1} />
      })}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#3f3f46" strokeWidth={1.5} />

      <line
        x1={padL}
        y1={midY}
        x2={padL + plotW}
        y2={midY}
        stroke={MID}
        strokeWidth={1.5}
        strokeDasharray="7 6"
      />

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

      {/* High point → first peak */}
      <line
        x1={firstPeak.x}
        y1={firstPeak.y}
        x2={boxHighX + boxW / 2}
        y2={padT - 10}
        stroke="#18181b"
        strokeWidth={1}
      />
      <rect x={boxHighX} y={8} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.5} />
      <text x={boxHighX + boxW / 2} y={24} textAnchor="middle" fontSize={10} fill="#71717a">
        High point
      </text>
      <text x={boxHighX + boxW / 2} y={40} textAnchor="middle" fontSize={14} fontWeight={600} fill="#18181b">
        {displayHigh}
      </text>

      {/* Low point → first trough */}
      <line
        x1={firstTrough.x}
        y1={firstTrough.y}
        x2={boxLowX + boxW / 2}
        y2={padT - 10}
        stroke="#18181b"
        strokeWidth={1}
      />
      <rect x={boxLowX} y={8} width={boxW} height={boxH} fill="#fff" stroke="#18181b" strokeWidth={1.5} />
      <text x={boxLowX + boxW / 2} y={24} textAnchor="middle" fontSize={10} fill="#71717a">
        Low point
      </text>
      <text x={boxLowX + boxW / 2} y={40} textAnchor="middle" fontSize={14} fontWeight={600} fill="#18181b">
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
    const ids = new Set(report.bands.filter((b) => b.low != null && b.high != null).map((b) => b.metric.id))
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

      {!band || band.low == null || band.high == null ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data voor high/low van deze maand.
        </p>
      ) : (
        <FixedOscillationWave displayLow={band.displayLow} displayHigh={band.displayHigh} />
      )}
    </div>
  )
}
