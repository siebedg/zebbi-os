import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronsRight, Droplets, Flame, Layers } from 'lucide-react'
import { seededRandom, type ShutdownStep } from '../../lib/shutdownStyle'
import { ShutdownItemLabel } from './ShutdownItemLabel'
import type { GameProps } from './ShutdownGames'

/* Shared helpers (kept local so each file stays self-contained). */

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

const PRIMARY =
  'inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95'

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

function StepHeader({ step, label, light = false }: { step: ShutdownStep; label: string; light?: boolean }) {
  return (
    <div key={step.key} className="sd-enter">
      <p className={`text-xs font-medium ${light ? 'text-white/55' : 'text-[var(--color-muted)]'}`}>
        {label} · {step.section}
      </p>
      <div className={`mt-2 text-xl font-medium leading-snug sm:text-2xl ${light ? 'text-white' : 'text-[var(--color-text)]'}`}>
        <ShutdownItemLabel text={step.text} />
      </div>
    </div>
  )
}

/* ── 7. Tower: stack a block for every step ──────────────────────────── */

export function TowerMode({ steps, index, accent, day, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const shapes = useMemo(() => {
    const rnd = seededRandom(day * 13 + 5)
    return steps.map((_, i) => ({
      width: 58 + rnd() * 32,
      shift: (rnd() - 0.5) * 14,
      mix: [100, 70, 45, 85, 55][i % 5],
    }))
  }, [day, steps])

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_16rem] sm:items-end">
      <div className="text-center sm:text-left">
        <StepHeader step={steps[index]} label={`Blok ${index + 1} van ${steps.length}`} />
        <button type="button" onClick={onComplete} className={`mt-6 ${PRIMARY}`} style={accentButton(accent)}>
          <Layers className="h-4 w-4" />
          Leg het blok
        </button>
      </div>

      <div className="relative mx-auto flex h-[22rem] w-full max-w-[16rem] flex-col-reverse items-center">
        <div className="h-2 w-full rounded-full bg-[var(--color-border)]" />
        {steps.slice(0, index).map((s, i) => (
          <div
            key={s.key}
            className={`flex h-9 items-center justify-center overflow-hidden rounded-md px-2 text-[10px] font-semibold ${i === index - 1 ? 'sd-drop' : ''}`}
            style={{
              width: `${shapes[i].width}%`,
              transform: `translateX(${shapes[i].shift}px)`,
              background: `color-mix(in oklab, ${accent} ${shapes[i].mix}%, var(--color-surface))`,
              color: shapes[i].mix > 65 ? onAccent(accent) : 'var(--color-text)',
              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.12)',
            }}
          >
            <span className="truncate">{s.text}</span>
          </div>
        ))}
        {/* ghost of the next block */}
        <div
          className="h-9 rounded-md border-2 border-dashed"
          style={{ width: `${shapes[index].width}%`, borderColor: accent, opacity: 0.45 }}
        />
      </div>
    </div>
  )
}

/* ── 8. Plant: every step grows it a little ──────────────────────────── */

export function PlantMode({ steps, index, accent, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const n = steps.length
  const base = 270
  const stemH = 40 + (index / n) * 190
  const topY = base - stemH
  const stem = `M 100 ${base} Q 118 ${base - stemH / 2} 100 ${topY}`
  const leaves = steps.slice(0, index).map((s, i) => {
    const y = base - 30 - (i / n) * 190
    const left = i % 2 === 0
    return { key: s.key, y, left, fresh: i === index - 1 }
  })

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[15rem_1fr]">
      <svg viewBox="0 0 200 330" className="mx-auto w-full max-w-[15rem]" role="img" aria-label={`Plant met ${index} bladeren`}>
        <path d={stem} fill="none" stroke="#3f8f4a" strokeWidth={6} strokeLinecap="round" style={{ transition: 'd 0.6s' }} />
        {leaves.map((l) => (
          <path
            key={l.key}
            className={l.fresh ? 'sd-leaf' : ''}
            d={
              l.left
                ? `M 104 ${l.y} C 80 ${l.y - 26}, 52 ${l.y - 14}, 44 ${l.y - 2} C 62 ${l.y + 10}, 86 ${l.y + 8}, 104 ${l.y} Z`
                : `M 104 ${l.y} C 128 ${l.y - 26}, 156 ${l.y - 14}, 164 ${l.y - 2} C 146 ${l.y + 10}, 122 ${l.y + 8}, 104 ${l.y} Z`
            }
            fill="#4caf50"
            stroke="#2e7d32"
            strokeWidth={1.5}
          />
        ))}
        {/* bud */}
        <circle cx={100} cy={topY} r={7 + (index / n) * 7} fill={accent} style={{ transition: 'cy 0.6s, r 0.6s' }} />
        {/* pot */}
        <path d="M 52 268 L 148 268 L 138 326 L 62 326 Z" fill="#c2703d" />
        <rect x={46} y={258} width={108} height={16} rx={4} fill="#a85b2f" />
      </svg>

      <div className="text-center sm:text-left">
        <StepHeader step={steps[index]} label={`Blad ${index + 1} van ${n}`} />
        <button type="button" onClick={onComplete} className={`mt-6 ${PRIMARY}`} style={accentButton(accent)}>
          <Droplets className="h-4 w-4" />
          Geef water
        </button>
      </div>
    </div>
  )
}

/* ── 9. Candles: blow one out for every step ─────────────────────────── */

export function CandlesMode({ steps, index, day, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const heights = useMemo(() => {
    const rnd = seededRandom(day * 7 + 3)
    return steps.map(() => 56 + Math.round(rnd() * 44))
  }, [day, steps])

  return (
    <div
      className="overflow-hidden rounded-3xl px-6 pb-8 pt-10 text-center text-white shadow-[0_30px_80px_-30px_rgba(40,20,0,0.8)] sm:px-10"
      style={{ background: 'radial-gradient(90% 80% at 50% 100%, #3a2412 0%, #170d06 60%, #070403 100%)' }}
    >
      <div className="flex min-h-[9.5rem] flex-wrap items-end justify-center gap-x-2.5 gap-y-6 sm:gap-x-6">
        {steps.map((s, i) => {
          const out = i < index
          const current = i === index
          return (
            <div key={s.key} className="relative flex flex-col items-center" style={{ opacity: out ? 0.55 : 1 }}>
              <div className="relative h-9 w-5 sm:w-6">
                {!out && (
                  <>
                    <span className="absolute -inset-3 rounded-full bg-amber-400/25 blur-md" style={{ opacity: current ? 1 : 0.5 }} />
                    <span
                      className="sd-flicker absolute bottom-0 left-1/2 h-8 w-4 -translate-x-1/2 rounded-[50%_50%_50%_50%/60%_60%_40%_40%]"
                      style={{
                        background: 'radial-gradient(circle at 50% 75%, #fff7d6 0%, #ffd34d 35%, #ff8a1f 70%, rgba(255,80,0,0) 100%)',
                        animationDelay: `${(i % 5) * 0.13}s`,
                      }}
                    />
                  </>
                )}
                {out && <span className="sd-smoke absolute bottom-0 left-1/2 h-8 w-1 -translate-x-1/2 rounded-full bg-white/30 blur-[2px]" />}
              </div>
              <span className="h-1.5 w-0.5 bg-neutral-800" />
              <span
                className="w-5 rounded-t-md sm:w-6"
                style={{
                  height: heights[i],
                  background: 'linear-gradient(90deg, #e9dfcc, #fffaf0 45%, #d9ccb4)',
                  boxShadow: current ? '0 0 24px 4px rgba(255,190,80,0.35)' : undefined,
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="mx-auto mt-10 max-w-lg">
        <StepHeader step={steps[index]} label={`Kaars ${index + 1} van ${steps.length}`} light />
        <button
          type="button"
          onClick={onComplete}
          className={`mt-6 ${PRIMARY}`}
          style={{ background: '#ffcf6b', color: '#1a0f05', boxShadow: '0 10px 30px -10px #ffb02e' }}
        >
          <Flame className="h-4 w-4" />
          Blaas uit
        </button>
      </div>
    </div>
  )
}

/* ── 10. Slide to confirm ────────────────────────────────────────────── */

const KNOB = 56

export function SlideMode({ steps, index, accent, onComplete }: GameProps) {
  useEnterKey(onComplete)
  const track = useRef<HTMLDivElement>(null)
  const grab = useRef<number | null>(null)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const max = () => (track.current ? track.current.clientWidth - KNOB - 8 : 1)
  const p = Math.min(1, x / Math.max(1, max()))

  useEffect(() => setX(0), [index])

  const move = (clientX: number) => {
    if (grab.current == null || !track.current) return
    const left = track.current.getBoundingClientRect().left + 4
    setX(Math.max(0, Math.min(max(), clientX - left - grab.current)))
  }

  const release = () => {
    if (grab.current == null) return
    grab.current = null
    setDragging(false)
    if (x >= max() * 0.92) {
      setX(max())
      window.setTimeout(onComplete, 160)
    } else {
      setX(0)
    }
  }

  return (
    <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
      <div className="max-w-lg">
        <StepHeader step={steps[index]} label={`${index + 1}/${steps.length}`} />
      </div>

      <div
        ref={track}
        className="relative mt-12 h-16 w-full max-w-sm overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-overlay)]"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: x + KNOB + 8, background: `color-mix(in srgb, ${accent} 22%, transparent)`, transition: dragging ? 'none' : 'width 0.3s' }}
        />
        <span
          className="sd-shimmer pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-sm font-medium text-[var(--color-muted)]"
          style={{ opacity: 1 - p * 1.4 }}
        >
          Schuif als het gedaan is
        </span>
        <button
          type="button"
          aria-label="Schuif om te bevestigen"
          className="absolute left-1 top-1 flex touch-none items-center justify-center rounded-full"
          style={{
            width: KNOB,
            height: KNOB - 2,
            transform: `translateX(${x}px)`,
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            ...accentButton(accent),
          }}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* synthetic or already-released pointer */
            }
            const knobLeft = e.currentTarget.getBoundingClientRect().left
            grab.current = e.clientX - knobLeft
            setDragging(true)
          }}
          onPointerMove={(e) => move(e.clientX)}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <ChevronsRight className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-4 text-xs text-[var(--color-muted)]">Of druk Enter</p>
    </div>
  )
}

/* ── 11. Scratch card: each step is hidden until you scratch it ──────── */

export function ScratchMode({ steps, index, accent, onComplete }: GameProps) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const moves = useRef(0)
  const [revealed, setRevealed] = useState(false)

  useLayoutEffect(() => {
    setRevealed(false)
    const c = canvas.current
    const b = box.current
    if (!c || !b) return
    const dpr = window.devicePixelRatio || 1
    const { width, height } = b.getBoundingClientRect()
    c.width = width * dpr
    c.height = height * dpr
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createLinearGradient(0, 0, width, height)
    g.addColorStop(0, accent)
    g.addColorStop(1, '#c0c0c8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 90; i++) ctx.fillRect((i * 37) % width, (i * 53) % height, 3, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Kras om je volgende stap te zien', width / 2, height / 2 + 5)
  }, [index, accent])

  const scratch = (clientX: number, clientY: number) => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || revealed) return
    const r = c.getBoundingClientRect()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(clientX - r.left, clientY - r.top, 26, 0, Math.PI * 2)
    ctx.fill()
    moves.current += 1
    if (moves.current % 8 === 0) {
      const data = ctx.getImageData(0, 0, c.width, c.height).data
      let clear = 0
      let total = 0
      for (let i = 3; i < data.length; i += 4 * 64) {
        total += 1
        if (data[i] < 40) clear += 1
      }
      if (clear / total > 0.5) setRevealed(true)
    }
  }

  const advance = () => (revealed ? onComplete() : setRevealed(true))
  useEnterKey(advance)

  return (
    <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
      <p className="text-xs font-medium text-[var(--color-muted)]">
        Lot {index + 1} van {steps.length}
      </p>
      <div
        ref={box}
        className="relative mt-4 flex h-60 w-full max-w-md items-center justify-center overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 shadow-[var(--shadow-card)]"
      >
        <div className="text-xl font-medium leading-snug text-[var(--color-text)] sm:text-2xl">
          <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">{steps[index].section}</p>
          <ShutdownItemLabel text={steps[index].text} showMedia={false} />
        </div>
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ opacity: revealed ? 0 : 1, transition: 'opacity 0.5s', pointerEvents: revealed ? 'none' : 'auto' }}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* synthetic or already-released pointer */
            }
            drawing.current = true
            scratch(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => drawing.current && scratch(e.clientX, e.clientY)}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
      </div>
      <button
        type="button"
        onClick={advance}
        className={`mt-8 ${PRIMARY}`}
        style={revealed ? accentButton(accent) : { border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
      >
        {revealed ? 'Gedaan' : 'Toon meteen'}
      </button>
    </div>
  )
}

/* ── 12. Bubbles: pop each step ──────────────────────────────────────── */

export function BubblesMode({ steps, index, accent, day, onComplete }: GameProps) {
  const [popping, setPopping] = useState(false)
  const pop = () => {
    if (popping) return
    setPopping(true)
    window.setTimeout(() => {
      setPopping(false)
      onComplete()
    }, 320)
  }
  useEnterKey(pop)

  const floaters = useMemo(() => {
    const rnd = seededRandom(day * 19 + 11)
    return Array.from({ length: 14 }, () => ({
      left: rnd() * 100,
      size: 10 + rnd() * 34,
      delay: rnd() * 9,
      dur: 7 + rnd() * 7,
    }))
  }, [day])
  const remaining = steps.length - index - 1

  return (
    <div
      className="relative flex min-h-[30rem] flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-10 text-center text-white"
      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 35%, #06121f) 0%, #06121f 100%)` }}
    >
      {floaters.map((f, i) => (
        <span
          key={i}
          className="sd-rise pointer-events-none absolute bottom-[-3rem] rounded-full border border-white/25"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.04) 60%)',
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.dur}s`,
          }}
        />
      ))}

      <button
        type="button"
        key={steps[index].key}
        onClick={pop}
        className={`relative flex h-72 w-72 items-center justify-center rounded-full border border-white/40 p-10 sm:h-80 sm:w-80 ${popping ? 'sd-burst' : 'sd-bob'}`}
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 18%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.14) 100%)',
          boxShadow: `inset -12px -18px 40px ${accent}55, 0 0 60px ${accent}33`,
        }}
      >
        <span className="block">
          <span className="block text-xs font-medium text-white/60">{steps[index].section}</span>
          <span className="mt-2 block text-lg font-medium leading-snug sm:text-xl">
            <ShutdownItemLabel text={steps[index].text} showMedia={false} />
          </span>
        </span>
      </button>

      <p className="relative mt-8 text-sm text-white/60">
        Tik de bel kapot · nog {remaining} {remaining === 1 ? 'bel' : 'bellen'} na deze
      </p>
    </div>
  )
}
