import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { ensureAccessToken, isUnlocked, setUnlocked } from '../lib/auth'
import { UNLOCK_PATTERN } from '../lib/accessConfig'
import { Card } from './ui'

function patternsEqual(a: number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function dotCenter(i: number, size: number, pad: number) {
  const col = i % 3
  const row = Math.floor(i / 3)
  const cell = (size - pad * 2) / 2
  return { x: pad + col * cell, y: pad + row * cell }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<number[]>([])
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<number[]>([])
  const drawingRef = useRef(false)

  useEffect(() => {
    if (isUnlocked()) {
      ensureAccessToken()
      setOpen(true)
    }
    setReady(true)
  }, [])

  const resetPath = () => {
    pathRef.current = []
    setPath([])
  }

  const finish = useCallback((next: number[]) => {
    drawingRef.current = false
    setDrawing(false)
    if (next.length < 4) {
      resetPath()
      return
    }
    if (patternsEqual(next, UNLOCK_PATTERN)) {
      setUnlocked(true)
      ensureAccessToken()
      setOpen(true)
      setError(null)
      resetPath()
      return
    }
    setShake(true)
    setError('Niet de juiste vorm — teken de Z')
    setTimeout(() => {
      setShake(false)
      resetPath()
    }, 450)
  }, [])

  const indexFromPoint = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    const hitR = 14
    for (let i = 0; i < 9; i++) {
      const c = dotCenter(i, 100, 18)
      const dx = x - c.x
      const dy = y - c.y
      if (dx * dx + dy * dy <= hitR * hitR) return i
    }
    return null
  }

  const addDot = (i: number | null) => {
    if (i == null) return
    if (pathRef.current.includes(i)) return
    pathRef.current = [...pathRef.current, i]
    setPath(pathRef.current)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    svgRef.current?.setPointerCapture?.(e.pointerId)
    setError(null)
    drawingRef.current = true
    setDrawing(true)
    resetPath()
    addDot(indexFromPoint(e.clientX, e.clientY))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    addDot(indexFromPoint(e.clientX, e.clientY))
  }

  const onPointerUp = () => {
    if (!drawingRef.current) return
    finish(pathRef.current)
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
        Laden…
      </div>
    )
  }

  if (open) return <>{children}</>

  const size = 100
  const pad = 18
  const centers = Array.from({ length: 9 }, (_, i) => dotCenter(i, size, pad))
  const linePoints = path.map((i) => centers[i])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <Card className={`w-full max-w-sm p-6 ${shake ? 'animate-pulse' : ''}`}>
        <div className="mb-2 flex items-center gap-2 text-[var(--color-text)]">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Zebbi OS</h2>
        </div>
        <p className="mb-1 text-sm text-[var(--color-muted)]">Teken je unlock-vorm</p>
        <p className="mb-5 text-xs text-[var(--color-muted)]">Hint: de letter Z</p>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto aspect-square w-full max-w-[16rem] touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label="Unlock pattern"
        >
          {linePoints.length > 1 && (
            <polyline
              points={linePoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}
          {centers.map((c, i) => {
            const active = path.includes(i)
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={active ? 5.5 : 4}
                fill={active ? 'var(--color-text)' : 'var(--color-surface-overlay)'}
                stroke="var(--color-border)"
                strokeWidth="1.5"
              />
            )
          })}
        </svg>

        {error && <p className="mt-4 text-center text-sm text-[var(--color-bad)]">{error}</p>}
        {drawing && path.length === 0 && (
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">Sleep over de punten…</p>
        )}
      </Card>
    </div>
  )
}
