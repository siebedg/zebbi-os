import { useEffect, useMemo, useRef, useState } from 'react'
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
const STEPS = 180

function computePts(phaseOffset: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    const phase = t * CYCLES * Math.PI * 2 + phaseOffset
    pts.push({
      x: PAD_L + t * PLOT_W,
      y: MID_Y - Math.sin(phase) * AMP,
    })
  }
  return pts
}

function firstPeak(pts: Pt[]): Pt {
  for (let i = 1; i < pts.length - 1; i++) {
    if (pts[i].y <= pts[i - 1].y && pts[i].y <= pts[i + 1].y) return pts[i]
  }
  return pts.reduce((a, b) => (b.y < a.y ? b : a))
}

function firstTrough(pts: Pt[]): Pt {
  for (let i = 1; i < pts.length - 1; i++) {
    if (pts[i].y >= pts[i - 1].y && pts[i].y >= pts[i + 1].y) return pts[i]
  }
  return pts.reduce((a, b) => (b.y > a.y ? b : a))
}

function segmentPaths(pts: Pt[]): { d: string; up: boolean }[] {
  const segs: { d: string; up: boolean }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const cx = (a.x + b.x) / 2
    segs.push({
      d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
      up: b.y <= a.y,
    })
  }
  return segs
}

function fillPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const cx = (a.x + b.x) / 2
    d += ` C ${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
  }
  d += ` L ${(PAD_L + PLOT_W).toFixed(1)} ${(PAD_T + PLOT_H).toFixed(1)} L ${PAD_L.toFixed(1)} ${(PAD_T + PLOT_H).toFixed(1)} Z`
  return d
}

function calloutStyle(x: number, otherX: number, preferLeft: boolean): CSSProperties {
  const overlap = Math.abs(x - otherX) < 200
  if (overlap) {
    return preferLeft
      ? { left: '0.75rem', top: '0.65rem' }
      : { right: '0.75rem', left: 'auto', top: '0.65rem' }
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
  animKey,
}: {
  displayLow: string
  displayHigh: string
  animKey: string
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const gRef = useRef<SVGGElement>(null)
  const fillRef = useRef<SVGPathElement>(null)
  const peakDot = useRef<SVGCircleElement>(null)
  const troughDot = useRef<SVGCircleElement>(null)
  const peakLine = useRef<SVGLineElement>(null)
  const troughLine = useRef<SVGLineElement>(null)
  const highCard = useRef<HTMLDivElement>(null)
  const lowCard = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const initial = useMemo(() => {
    const pts = computePts(0)
    return { segs: segmentPaths(pts), fill: fillPath(pts), peak: firstPeak(pts), trough: firstTrough(pts) }
  }, [animKey])

  useEffect(() => {
    setReady(false)
    const t = window.setTimeout(() => setReady(true), 40)
    return () => window.clearTimeout(t)
  }, [animKey])

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let raf = 0
    const t0 = performance.now()

    const tick = (now: number) => {
      const phase = ((now - t0) / 1000) * 0.32
      const pts = computePts(phase)
      const segs = segmentPaths(pts)
      const peak = firstPeak(pts)
      const trough = firstTrough(pts)

      const g = gRef.current
      if (g) {
        const paths = g.querySelectorAll('path')
        segs.forEach((s, i) => {
          const el = paths[i]
          if (el) {
            el.setAttribute('d', s.d)
            el.setAttribute('stroke', s.up ? UP : DOWN)
          }
        })
      }
      if (fillRef.current) fillRef.current.setAttribute('d', fillPath(pts))
      if (peakDot.current) {
        peakDot.current.setAttribute('cx', String(peak.x))
        peakDot.current.setAttribute('cy', String(peak.y))
      }
      if (troughDot.current) {
        troughDot.current.setAttribute('cx', String(trough.x))
        troughDot.current.setAttribute('cy', String(trough.y))
      }
      if (peakLine.current) {
        peakLine.current.setAttribute('x1', String(peak.x))
        peakLine.current.setAttribute('x2', String(peak.x))
        peakLine.current.setAttribute('y1', String(peak.y))
      }
      if (troughLine.current) {
        troughLine.current.setAttribute('x1', String(trough.x))
        troughLine.current.setAttribute('x2', String(trough.x))
        troughLine.current.setAttribute('y1', String(trough.y))
      }

      if (highCard.current) {
        const st = calloutStyle(peak.x, trough.x, peak.x <= trough.x)
        highCard.current.style.left = typeof st.left === 'string' ? st.left : 'auto'
        highCard.current.style.right = typeof st.right === 'string' ? st.right : 'auto'
        highCard.current.style.top = typeof st.top === 'string' ? st.top : '0.65rem'
      }
      if (lowCard.current) {
        const st = calloutStyle(trough.x, peak.x, trough.x < peak.x)
        lowCard.current.style.left = typeof st.left === 'string' ? st.left : 'auto'
        lowCard.current.style.right = typeof st.right === 'string' ? st.right : 'auto'
        lowCard.current.style.top = typeof st.top === 'string' ? st.top : '0.65rem'
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animKey])

  const chartBg = dark ? '#121214' : '#eef0f2'
  const grid = dark ? '#2a2a2e' : '#dde0e4'
  const axis = dark ? '#3f3f46' : '#9ca3af'
  const mid = dark ? '#2dd4bf66' : '#5eead4'
  const calloutBorder = dark ? '#3f3f46' : '#18181b'
  const calloutBg = dark ? '#18181b' : '#ffffff'
  const calloutMuted = dark ? '#a1a1aa' : '#71717a'
  const calloutText = dark ? '#fafafa' : '#18181b'

  const highStyle = calloutStyle(initial.peak.x, initial.trough.x, initial.peak.x <= initial.trough.x)
  const lowStyle = calloutStyle(initial.trough.x, initial.peak.x, initial.trough.x < initial.peak.x)

  return (
    <div className={`relative transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <div
        ref={highCard}
        className="osc-callout pointer-events-none absolute z-10 w-[9rem] rounded-xl border px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        style={{
          ...highStyle,
          borderColor: calloutBorder,
          background: calloutBg,
          animationDelay: '0.25s',
        }}
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
        ref={lowCard}
        className="osc-callout pointer-events-none absolute z-10 w-[9rem] rounded-xl border px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        style={{
          ...lowStyle,
          borderColor: calloutBorder,
          background: calloutBg,
          animationDelay: '0.4s',
        }}
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
          <filter id="osc-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx="4" fill={chartBg} />

        {Array.from({ length: 18 }).map((_, i) => {
          const x = PAD_L + ((i + 1) / 19) * PLOT_W
          return (
            <line
              key={i}
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + PLOT_H}
              stroke={grid}
              strokeWidth={1}
            />
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

        <path ref={fillRef} d={initial.fill} fill="url(#osc-fill)" />

        <g ref={gRef} filter="url(#osc-soft)">
          {initial.segs.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={s.up ? UP : DOWN}
              strokeWidth={3.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        <line
          ref={peakLine}
          x1={initial.peak.x}
          y1={initial.peak.y}
          x2={initial.peak.x}
          y2={PAD_T - 2}
          stroke={calloutBorder}
          strokeWidth={1}
          opacity={0.45}
        />
        <line
          ref={troughLine}
          x1={initial.trough.x}
          y1={initial.trough.y}
          x2={initial.trough.x}
          y2={PAD_T - 2}
          stroke={calloutBorder}
          strokeWidth={1}
          opacity={0.45}
        />

        <circle
          ref={peakDot}
          cx={initial.peak.x}
          cy={initial.peak.y}
          r={5.5}
          fill={UP}
          stroke={calloutBg}
          strokeWidth={2.5}
        />
        <circle
          ref={troughDot}
          cx={initial.trough.x}
          cy={initial.trough.y}
          r={5.5}
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
      <div className="osc-fade-up mb-12 flex items-center justify-center gap-1">
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

      <header className="osc-fade-up mb-9 text-center" style={{ animationDelay: '60ms' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Oscillation
        </p>
        <h1 className="font-display text-[2.15rem] font-medium leading-[1.15] tracking-[-0.02em] text-[var(--color-text)] sm:text-[3rem]">
          Oscillation of my <span className="italic">{metricLabel}</span>
        </h1>
      </header>

      {available.length > 0 && (
        <nav
          className="osc-fade-up mb-9 flex flex-wrap items-center justify-center gap-1"
          style={{ animationDelay: '120ms' }}
          aria-label="Metric"
        >
          {available.map((m) => {
            const on = m.id === activeId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricId(m.id)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
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
        <div className="osc-fade-up rounded-2xl border border-dashed border-[var(--color-border)] py-28 text-center">
          <p className="font-display text-2xl text-[var(--color-muted)]">Nog te weinig data</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Een paar dagen loggen en high / low verschijnen hier.
          </p>
        </div>
      ) : (
        <div
          className="osc-fade-up overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-5"
          style={{ animationDelay: '180ms' }}
        >
          <OscillationWave
            key={`${monthKey}-${activeId}`}
            displayLow={band.displayLow}
            displayHigh={band.displayHigh}
            animKey={`${monthKey}-${activeId}-${band.displayLow}-${band.displayHigh}`}
          />
        </div>
      )}

      {band && band.low != null && band.high != null && (
        <p
          className="osc-fade-up mt-6 text-center text-[12px] leading-relaxed text-[var(--color-muted)]"
          style={{ animationDelay: '280ms' }}
        >
          Low = absolute floor · til die op om je baseline te verhogen
          <span className="mx-1.5 opacity-40">·</span>
          {band.samples} samples deze maand
        </p>
      )}
    </div>
  )
}
