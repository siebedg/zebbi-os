import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import {
  OSCILLATION_METRICS,
  buildOscillationReport,
  currentMonthKey,
} from '../lib/oscillation'
import { useTheme } from '../hooks/useTheme'

const UP = '#2dd4bf'
const DOWN = '#f472b6'

type Pt = { x: number; y: number }

const W = 1000
const H = 460
const PAD_L = 28
const PAD_R = 28
const PAD_T = 92
const PAD_B = 40
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B
const MID_Y = PAD_T + PLOT_H / 2
const AMP = PLOT_H * 0.38
const CYCLES = 2
const PHASE_END = CYCLES * Math.PI * 2

function xyAt(phase: number): Pt {
  const t = phase / PHASE_END
  return {
    x: PAD_L + t * PLOT_W,
    y: MID_Y - Math.sin(phase) * AMP,
  }
}

/** Slope dy/dx of the sine in SVG space */
function slopeAt(phase: number): number {
  const dxDphase = PLOT_W / PHASE_END
  const dyDphase = -AMP * Math.cos(phase)
  return dyDphase / dxDphase
}

/**
 * Smooth cubic Hermite segment — matches position + tangent at both ends,
 * so adjacent segments join without kinks.
 */
function hermiteCubic(p0: Pt, m0: number, p1: Pt, m1: number): string {
  const dx = p1.x - p0.x
  const c1x = p0.x + dx / 3
  const c1y = p0.y + (m0 * dx) / 3
  const c2x = p1.x - dx / 3
  const c2y = p1.y - (m1 * dx) / 3
  return `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
}

/** Build one continuous smooth path over [phase0, phase1] */
function smoothArc(phase0: number, phase1: number, pieces = 6): string {
  const start = xyAt(phase0)
  let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`
  for (let i = 0; i < pieces; i++) {
    const a = phase0 + ((phase1 - phase0) * i) / pieces
    const b = phase0 + ((phase1 - phase0) * (i + 1)) / pieces
    d += hermiteCubic(xyAt(a), slopeAt(a), xyAt(b), slopeAt(b))
  }
  return d
}

function buildWave() {
  // Split at every extremum so each arc is purely rising or falling
  const splits: number[] = [0]
  for (let k = 0; k < CYCLES * 2; k++) {
    splits.push(Math.PI / 2 + k * Math.PI)
  }
  splits.push(PHASE_END)

  const arcs: { d: string; up: boolean }[] = []
  for (let i = 0; i < splits.length - 1; i++) {
    const a = splits[i]
    const b = splits[i + 1]
    // Midpoint of interval: cos > 0 ⇒ rising (y decreases)
    const mid = (a + b) / 2
    const up = Math.cos(mid) > 0
    arcs.push({ d: smoothArc(a, b, 8), up })
  }

  // Soft fill under full wave
  const fillStart = xyAt(0)
  let fill = `M ${fillStart.x.toFixed(2)} ${fillStart.y.toFixed(2)}`
  fill += hermitePieces(0, PHASE_END, 24)
  fill += ` L ${(PAD_L + PLOT_W).toFixed(2)} ${(PAD_T + PLOT_H).toFixed(2)} L ${PAD_L.toFixed(2)} ${(PAD_T + PLOT_H).toFixed(2)} Z`

  const peak = xyAt(Math.PI / 2)
  const trough = xyAt((3 * Math.PI) / 2)

  return { arcs, fill, peak, trough }
}

function hermitePieces(phase0: number, phase1: number, pieces: number): string {
  let d = ''
  for (let i = 0; i < pieces; i++) {
    const a = phase0 + ((phase1 - phase0) * i) / pieces
    const b = phase0 + ((phase1 - phase0) * (i + 1)) / pieces
    d += hermiteCubic(xyAt(a), slopeAt(a), xyAt(b), slopeAt(b))
  }
  return d
}

function calloutStyle(x: number, otherX: number, isHigh: boolean): CSSProperties {
  // Keep high near first peak, low near first trough — avoid stacking
  if (Math.abs(x - otherX) < 180) {
    return isHigh
      ? { left: '0.75rem', top: '0.65rem' }
      : { left: 'auto', right: '0.75rem', top: '0.65rem' }
  }
  const pct = (x / W) * 100
  return {
    left: `clamp(0.5rem, ${pct}% - 4.5rem, calc(100% - 9.5rem))`,
    top: '0.65rem',
  }
}

function OscillationWave({
  displayLow,
  displayHigh,
}: {
  displayLow: string
  displayHigh: string
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const wave = useMemo(() => buildWave(), [])

  const chartBg = dark ? '#121214' : '#eef0f2'
  const grid = dark ? '#2a2a2e' : '#dde0e4'
  const axis = dark ? '#3f3f46' : '#9ca3af'
  const mid = dark ? '#2dd4bf66' : '#5eead4'
  const calloutBorder = dark ? '#3f3f46' : '#18181b'
  const calloutBg = dark ? '#18181b' : '#ffffff'
  const calloutMuted = dark ? '#a1a1aa' : '#71717a'
  const calloutText = dark ? '#fafafa' : '#18181b'

  const highStyle = calloutStyle(wave.peak.x, wave.trough.x, true)
  const lowStyle = calloutStyle(wave.trough.x, wave.peak.x, false)

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute z-10 w-[9rem] rounded-xl border px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        style={{ ...highStyle, borderColor: calloutBorder, background: calloutBg }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: calloutMuted }}>
          High point
        </p>
        <p
          className="mt-1 text-[1.25rem] font-semibold tabular-nums leading-none tracking-tight"
          style={{ color: calloutText }}
        >
          {displayHigh}
        </p>
      </div>

      <div
        className="pointer-events-none absolute z-10 w-[9rem] rounded-xl border px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        style={{ ...lowStyle, borderColor: calloutBorder, background: calloutBg }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: calloutMuted }}>
          Low point
        </p>
        <p
          className="mt-1 text-[1.25rem] font-semibold tabular-nums leading-none tracking-tight"
          style={{ color: calloutText }}
        >
          {displayLow}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Oscillation high ${displayHigh} low ${displayLow}`}
      >
        <defs>
          <linearGradient id="osc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={UP} stopOpacity={dark ? 0.14 : 0.18} />
            <stop offset="55%" stopColor={DOWN} stopOpacity={dark ? 0.06 : 0.08} />
            <stop offset="100%" stopColor={DOWN} stopOpacity={0} />
          </linearGradient>
        </defs>

        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx="4" fill={chartBg} />

        {Array.from({ length: 18 }).map((_, i) => {
          const x = PAD_L + ((i + 1) / 19) * PLOT_W
          return (
            <line key={i} x1={x} y1={PAD_T} x2={x} y2={PAD_T + PLOT_H} stroke={grid} strokeWidth={1} />
          )
        })}

        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke={axis}
          strokeWidth={1.5}
        />

        <line
          x1={PAD_L}
          y1={MID_Y}
          x2={PAD_L + PLOT_W}
          y2={MID_Y}
          stroke={mid}
          strokeWidth={1.75}
          strokeDasharray="6 7"
        />

        <path d={wave.fill} fill="url(#osc-fill)" />

        {wave.arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.d}
            fill="none"
            stroke={arc.up ? UP : DOWN}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        <line
          x1={wave.peak.x}
          y1={wave.peak.y}
          x2={wave.peak.x}
          y2={PAD_T - 2}
          stroke={calloutBorder}
          strokeWidth={1}
          opacity={0.45}
        />
        <line
          x1={wave.trough.x}
          y1={wave.trough.y}
          x2={wave.trough.x}
          y2={PAD_T - 2}
          stroke={calloutBorder}
          strokeWidth={1}
          opacity={0.45}
        />

        <circle
          cx={wave.peak.x}
          cy={wave.peak.y}
          r={5}
          fill={UP}
          stroke={calloutBg}
          strokeWidth={2.5}
        />
        <circle
          cx={wave.trough.x}
          cy={wave.trough.y}
          r={5}
          fill={DOWN}
          stroke={calloutBg}
          strokeWidth={2.5}
        />
      </svg>
    </div>
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
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-12 flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
          aria-label="Vorige maand"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9.5rem] select-none text-center text-[13px] capitalize tracking-wide text-[var(--color-muted)]">
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

      <header className="mb-9 text-center">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Oscillation
        </p>
        <h1 className="font-display text-[2.15rem] font-medium leading-[1.15] tracking-[-0.02em] text-[var(--color-text)] sm:text-[3rem]">
          Oscillation of my <span className="italic">{metricLabel}</span>
        </h1>
      </header>

      {available.length > 0 && (
        <nav className="mb-9 flex flex-wrap items-center justify-center gap-1" aria-label="Metric">
          {available.map((m) => {
            const on = m.id === activeId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricId(m.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  on
                    ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </nav>
      )}

      {!band || band.low == null || band.high == null ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-28 text-center">
          <p className="font-display text-2xl text-[var(--color-muted)]">Nog te weinig data</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Een paar dagen loggen en high / low verschijnen hier.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-5">
          <OscillationWave displayLow={band.displayLow} displayHigh={band.displayHigh} />
        </div>
      )}
    </div>
  )
}
