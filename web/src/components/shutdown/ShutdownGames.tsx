import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Check, CornerDownLeft, Sparkles } from 'lucide-react'
import { seededRandom, type ShutdownStep, type ShutdownStyleId } from '../../lib/shutdownStyle'
import { ShutdownItemLabel } from './ShutdownItemLabel'

export type GameProps = {
  steps: ShutdownStep[]
  /** Index of the step being played now. */
  index: number
  accent: string
  /** Seed for anything that should look different per day but stay put on reload. */
  day: number
  onComplete: () => void
}

/** Readable text colour on top of an accent. */
function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#111111' : '#ffffff'
}

function accentButton(accent: string): CSSProperties {
  return { background: accent, color: onAccent(accent), boxShadow: `0 10px 30px -10px ${accent}` }
}

/** Enter completes the current step, except while typing in a field. */
function useEnterKey(handler: () => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return
      e.preventDefault()
      ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function StepText({ step, className = '' }: { step: ShutdownStep; className?: string }) {
  return (
    <div className={className}>
      <ShutdownItemLabel text={step.text} />
    </div>
  )
}

/* ── 1. Focus: one big step at a time ─────────────────────────────────── */

function FocusMode({ steps, index, accent, onComplete }: GameProps) {
  const step = steps[index]
  useEnterKey(onComplete)
  return (
    <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
      <div className="mb-10 flex flex-wrap justify-center gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.key}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === index ? 28 : 8,
              background: i <= index ? accent : 'var(--color-border)',
              opacity: i < index ? 0.4 : 1,
            }}
          />
        ))}
      </div>
      <div key={step.key} className="sd-enter w-full max-w-lg">
        <p className="text-xs font-medium tracking-wide text-[var(--color-muted)]">{step.section}</p>
        <StepText
          step={step}
          className="mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-[var(--color-text)] sm:text-[2.6rem]"
        />
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="mt-12 inline-flex h-14 items-center gap-2 rounded-full px-9 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-95"
        style={accentButton(accent)}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
        Gedaan
      </button>
    </div>
  )
}

/* ── 2. Board game: a pawn walks a winding path ───────────────────────── */

const BOARD_X = [60, 150, 240, 150]
const BOARD_GAP = 84

function PathMode({ steps, index, accent, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const pts = steps.map((_, i) => ({ x: BOARD_X[i % BOARD_X.length], y: 44 + i * BOARD_GAP }))
  const h = 44 * 2 + (steps.length - 1) * BOARD_GAP
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M ${a.x} ${a.y} C ${a.x} ${a.y + BOARD_GAP / 2}, ${b.x} ${b.y - BOARD_GAP / 2}, ${b.x} ${b.y}`
  const pawn = pts[index]
  const step = steps[index]

  return (
    <div className="grid gap-6 sm:grid-cols-[16rem_1fr] sm:items-start">
      <div className="order-2 mx-auto w-full max-w-[16rem] sm:order-1">
        <svg viewBox={`0 0 300 ${h}`} className="w-full" role="img" aria-label={`Stap ${index + 1} van ${steps.length}`}>
          {pts.slice(1).map((p, i) => (
            <path
              key={i}
              d={seg(pts[i], p)}
              fill="none"
              stroke={i < index ? accent : 'var(--color-border)'}
              strokeWidth={i < index ? 7 : 5}
              strokeLinecap="round"
              strokeDasharray={i < index ? undefined : '2 12'}
              style={{ transition: 'stroke 0.5s' }}
            />
          ))}
          {pts.map((p, i) => {
            const done = i < index
            const current = i === index
            return (
              <g
                key={steps[i].key}
                onClick={current ? onComplete : undefined}
                style={{ cursor: current ? 'pointer' : 'default' }}
              >
                {current && (
                  <circle cx={p.x} cy={p.y} r={24} fill={accent} className="sd-pulse" />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={22}
                  fill={done ? accent : 'var(--color-surface)'}
                  stroke={done || current ? accent : 'var(--color-border)'}
                  strokeWidth={3}
                />
                <text
                  x={p.x}
                  y={p.y + 6}
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="700"
                  fill={done ? onAccent(accent) : current ? accent : 'var(--color-muted)'}
                >
                  {done ? '✓' : i + 1}
                </text>
              </g>
            )
          })}
          {/* the pawn */}
          <g style={{ transform: `translate(${pawn.x}px, ${pawn.y - 42}px)`, transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <ellipse cx={0} cy={30} rx={11} ry={3.5} fill="black" opacity={0.15} />
            <circle cx={0} cy={0} r={8} fill="var(--color-text)" />
            <path d="M -9 24 Q 0 4 9 24 Z" fill="var(--color-text)" />
          </g>
        </svg>
      </div>

      <div className="order-1 sm:sticky sm:top-24 sm:order-2">
        <div
          key={step.key}
          className="sd-enter rounded-3xl border-2 bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
          style={{ borderColor: accent }}
        >
          <p className="text-xs font-semibold" style={{ color: accent }}>
            Vak {index + 1} van {steps.length} · {step.section}
          </p>
          <StepText step={step} className="mt-3 text-xl font-medium leading-snug text-[var(--color-text)] sm:text-2xl" />
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95"
            style={accentButton(accent)}
          >
            Zet je pion vooruit
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 3. Card game: play each card off the deck ───────────────────────── */

function DeckMode({ steps, index, accent, onComplete }: GameProps) {
  const [leaving, setLeaving] = useState(false)
  const play = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => {
      setLeaving(false)
      onComplete()
    }, 420)
  }
  useEnterKey(play)
  const left = steps.length - index
  const dir = index % 2 === 0 ? 1 : -1

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[24rem] w-full max-w-sm">
        {[2, 1].map((depth) =>
          left > depth ? (
            <div
              key={`back-${depth}`}
              className="absolute inset-0 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
              style={{
                transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.05}) rotate(${depth * (depth === 1 ? -3 : 4)}deg)`,
              }}
            />
          ) : null,
        )}
        <button
          type="button"
          key={steps[index].key}
          onClick={play}
          className="sd-deal absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] text-left shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
          style={{
            transform: leaving ? `translateX(${dir * 130}%) rotate(${dir * 22}deg)` : undefined,
            opacity: leaving ? 0 : 1,
            transition: 'transform 0.42s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.42s',
          }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ background: accent, color: onAccent(accent) }}>
            <span className="text-sm font-semibold">{steps[index].section}</span>
            <span className="font-display text-2xl font-medium tabular-nums">{index + 1}</span>
          </div>
          <div className="flex flex-1 items-center justify-center px-7 text-center">
            <StepText step={steps[index]} className="font-display text-[1.75rem] font-medium leading-tight text-[var(--color-text)]" />
          </div>
          <p className="pb-5 text-center text-xs font-medium text-[var(--color-muted)]">Tik om de kaart weg te spelen</p>
        </button>
      </div>
      <p className="mt-8 text-sm text-[var(--color-muted)] tabular-nums">
        {index} gespeeld · {left} in je hand
      </p>
    </div>
  )
}

/* ── 4. Terminal: type the evening away ──────────────────────────────── */

function TerminalMode({ steps, index, accent, onComplete }: GameProps) {
  const step = steps[index]
  const [typed, setTyped] = useState(0)
  const done = typed >= step.text.length

  useEffect(() => {
    setTyped(0)
    const id = window.setInterval(() => {
      setTyped((t) => {
        if (t >= step.text.length) {
          window.clearInterval(id)
          return t
        }
        return t + 1
      })
    }, 22)
    return () => window.clearInterval(id)
  }, [step.key, step.text.length])

  const enter = () => (done ? onComplete() : setTyped(step.text.length))
  useEnterKey(enter)

  return (
    <div className="overflow-hidden rounded-2xl border border-black/40 bg-[#0b0f14] font-mono text-[13px] leading-relaxed text-[#d1d5db] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] sm:text-sm">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-white/40">zebbi@shutdown ~ %</span>
      </div>
      <div className="min-h-[22rem] space-y-1.5 p-5">
        <p className="text-white/40">$ ./shutdown --steps {steps.length}</p>
        {steps.slice(0, index).map((s) => (
          <p key={s.key} className="text-white/45">
            <span style={{ color: accent }}>✓</span> {s.text}
          </p>
        ))}
        <p className="pt-2 text-white">
          <span style={{ color: accent }}>❯</span> {step.text.slice(0, typed)}
          <span className="sd-blink ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em]" style={{ background: accent }} />
        </p>
        {done && (
          <p className="sd-enter pt-1 text-xs text-white/40">
            [{step.section}] druk Enter als het gedaan is
          </p>
        )}
      </div>
      <div className="flex justify-end border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={enter}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-4 font-sans text-sm font-semibold transition-transform active:scale-95"
          style={accentButton(accent)}
        >
          Enter <CornerDownLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ── 5. Hold: press and hold to confirm each step ────────────────────── */

const HOLD_MS = 1100
const RING_R = 88
const RING_C = 2 * Math.PI * RING_R

function HoldMode({ steps, index, accent, onComplete }: GameProps) {
  const step = steps[index]
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)
  const startedAt = useRef<number | null>(null)
  const doneRef = useRef(onComplete)
  doneRef.current = onComplete

  const timeout = useRef<number | null>(null)

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    if (timeout.current) window.clearTimeout(timeout.current)
    raf.current = null
    timeout.current = null
    startedAt.current = null
    setProgress(0)
  }

  /** The timeout decides completion; the animation frame only paints the ring. */
  const start = () => {
    if (timeout.current) return
    startedAt.current = performance.now()
    timeout.current = window.setTimeout(() => {
      stop()
      doneRef.current()
    }, HOLD_MS)
    const tick = (now: number) => {
      if (startedAt.current == null) return
      setProgress(Math.min(1, (now - startedAt.current) / HOLD_MS))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => stop(), [])

  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
      <div key={step.key} className="sd-enter max-w-lg">
        <p className="text-xs font-medium text-[var(--color-muted)]">
          {index + 1}/{steps.length} · {step.section}
        </p>
        <StepText step={step} className="mt-3 text-2xl font-medium leading-snug text-[var(--color-text)] sm:text-3xl" />
      </div>

      <button
        type="button"
        aria-label="Houd vast om te bevestigen"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
        onContextMenu={(e) => e.preventDefault()}
        className="relative mt-10 h-52 w-52 touch-none select-none rounded-full"
        style={{ transform: `scale(${1 - progress * 0.06})`, transition: progress === 0 ? 'transform 0.2s' : 'none' }}
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx={100} cy={100} r={RING_R} fill="none" stroke="var(--color-border)" strokeWidth={10} />
          <circle
            cx={100}
            cy={100}
            r={RING_R}
            fill="none"
            stroke={accent}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </svg>
        <span
          className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full text-sm font-semibold"
          style={{ background: `color-mix(in srgb, ${accent} ${12 + progress * 70}%, var(--color-surface))`, color: progress > 0.6 ? onAccent(accent) : 'var(--color-text)' }}
        >
          <Check className="mb-1 h-7 w-7" strokeWidth={2.5} />
          Houd vast
        </span>
      </button>
      <p className="mt-6 text-xs text-[var(--color-muted)]">Loslaten = opnieuw. Of houd spatie ingedrukt.</p>
    </div>
  )
}

/* ── 6. Night sky: light a star for every step ───────────────────────── */

function SkyMode({ steps, index, accent, day, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const { stars, dust } = useMemo(() => {
    const rnd = seededRandom(day * 97 + steps.length)
    const n = steps.length
    const stars = steps.map((_, i) => ({
      x: 9 + (n === 1 ? 41 : (i / (n - 1)) * 82) + (rnd() - 0.5) * 6,
      y: 12 + rnd() * 34,
    }))
    const dust = Array.from({ length: 70 }, () => ({ x: rnd() * 100, y: rnd() * 60, r: 0.12 + rnd() * 0.28, d: rnd() * 4 }))
    return { stars, dust }
  }, [day, steps])

  const step = steps[index]
  const lit = stars.slice(0, index + 1)

  return (
    <div
      className="overflow-hidden rounded-3xl text-white shadow-[0_30px_80px_-30px_rgba(10,10,40,0.8)]"
      style={{ background: 'radial-gradient(120% 90% at 50% 0%, #1b2450 0%, #0b1029 55%, #05060f 100%)' }}
    >
      <svg viewBox="0 0 100 60" className="block w-full">
        {dust.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="white" className="sd-twinkle" style={{ animationDelay: `${d.d}s` }} />
        ))}
        {lit.length > 1 && (
          <polyline
            points={lit.map((s) => `${s.x},${s.y}`).join(' ')}
            fill="none"
            stroke={accent}
            strokeWidth={0.35}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}
        {stars.map((s, i) => {
          const done = i < index
          const current = i === index
          return (
            <g key={steps[i].key} onClick={current ? onComplete : undefined} style={{ cursor: current ? 'pointer' : 'default' }}>
              {current && <circle cx={s.x} cy={s.y} r={3.2} fill={accent} className="sd-pulse" />}
              {(done || current) && <circle cx={s.x} cy={s.y} r={done ? 2.2 : 2.6} fill={accent} opacity={0.25} />}
              <path
                d={`M ${s.x} ${s.y - 1.6} L ${s.x + 0.45} ${s.y - 0.45} L ${s.x + 1.6} ${s.y} L ${s.x + 0.45} ${s.y + 0.45} L ${s.x} ${s.y + 1.6} L ${s.x - 0.45} ${s.y + 0.45} L ${s.x - 1.6} ${s.y} L ${s.x - 0.45} ${s.y - 0.45} Z`}
                fill={done ? '#ffffff' : current ? accent : 'rgba(255,255,255,0.22)'}
                style={{ transition: 'fill 0.6s' }}
              />
              {current && <circle cx={s.x} cy={s.y} r={5} fill="transparent" />}
            </g>
          )
        })}
      </svg>
      <div key={step.key} className="sd-enter px-6 pb-7 pt-1 text-center sm:px-10">
        <p className="text-xs font-medium text-white/50">
          Ster {index + 1} van {steps.length} · {step.section}
        </p>
        <StepText step={step} className="mt-2 text-xl font-medium leading-snug sm:text-2xl" />
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95"
          style={accentButton(accent)}
        >
          <Sparkles className="h-4 w-4" />
          Steek de ster aan
        </button>
      </div>
    </div>
  )
}

export const SHUTDOWN_GAMES: Record<ShutdownStyleId, (props: GameProps) => JSX.Element> = {
  focus: FocusMode,
  path: PathMode,
  deck: DeckMode,
  terminal: TerminalMode,
  hold: HoldMode,
  sky: SkyMode,
}
