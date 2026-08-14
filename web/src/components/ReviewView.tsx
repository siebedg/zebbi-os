import { useMemo, useState } from 'react'
import type { CommittedFloors, DailyEntry, OscillationProtocol } from '../types'
import { cycleProgress, floorRows, closeCycle, normalizeOscillationProtocol } from '../lib/oscillationProtocol'
import { todayISO } from '../lib/utils'
import { useTheme } from '../hooks/useTheme'
import { Btn, Card, PageHeader, Pill } from './ui'

const UP = '#2dd4bf'
const DOWN = '#f472b6'
const W = 1000
const H = 280
const PAD_L = 36
const PAD_R = 36
const PAD_T = 28
const PAD_B = 36
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B
const MID_Y = PAD_T + PLOT_H / 2
const AMP = PLOT_H * 0.36

function waveY(t: number) {
  return MID_Y - Math.sin(t * Math.PI * 2) * AMP
}

function wavePath() {
  const n = 80
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = PAD_L + t * PLOT_W
    const y = waveY(t)
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }
  return d
}

function MapWave({
  high,
  low,
  period,
  goal,
}: {
  high: string
  low: string
  period: string
  goal: string
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const d = useMemo(() => wavePath(), [])
  const peak = { x: PAD_L + 0.25 * PLOT_W, y: waveY(0.25) }
  const trough = { x: PAD_L + 0.75 * PLOT_W, y: waveY(0.75) }
  const ink = dark ? '#fafafa' : '#18181b'
  const mute = dark ? '#a1a1aa' : '#71717a'
  const grid = dark ? '#2a2a2e' : '#e4e4e7'
  const bg = dark ? '#121214' : '#f4f4f5'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Oscillation map">
      <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx="6" fill={bg} />
      <line
        x1={PAD_L}
        y1={MID_Y}
        x2={PAD_L + PLOT_W}
        y2={MID_Y}
        stroke={UP}
        strokeOpacity={0.45}
        strokeDasharray="6 7"
      />
      <path d={d} fill="none" stroke={grid} strokeWidth="8" />
      <path d={d} fill="none" stroke={UP} strokeWidth="2.5" />
      <circle cx={peak.x} cy={peak.y} r="6" fill={UP} />
      <circle cx={trough.x} cy={trough.y} r="6" fill={DOWN} />
      <text x={peak.x} y={peak.y - 16} textAnchor="middle" fill={ink} fontSize="15" fontWeight="600">
        {high}
      </text>
      <text x={peak.x} y={peak.y - 34} textAnchor="middle" fill={mute} fontSize="11" letterSpacing="0.12em">
        +AMP · NEVER SURPASS
      </text>
      <text x={trough.x} y={trough.y + 28} textAnchor="middle" fill={ink} fontSize="15" fontWeight="600">
        {low}
      </text>
      <text x={trough.x} y={trough.y + 46} textAnchor="middle" fill={mute} fontSize="11" letterSpacing="0.12em">
        FLOOR · NEVER BREAK
      </text>
      <text x={PAD_L + PLOT_W / 2} y={H - 8} textAnchor="middle" fill={mute} fontSize="12">
        {period} · goal {goal}
      </text>
    </svg>
  )
}

function Field({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)]/40"
      />
    </label>
  )
}

const CHECKS = [
  { id: 'lunch', label: 'Checkpoint after lunch', hint: 'Focus % and timetable — mid-day, not post-mortem.' },
  { id: 'dinner', label: 'Checkpoint before dinner', hint: 'Same numbers. Correct today, not next week.' },
  { id: 'eod', label: '60s end of day', hint: 'Block 1 on time · meditate · timetable. Yes / no.' },
  { id: 'evening', label: 'Evening routine on time', hint: 'If this slips, the delay hits tomorrow’s work.' },
] as const

function todayChecksKey() {
  return `zebbi-30d-checks-${todayISO()}`
}

function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(todayChecksKey()) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

function saveChecks(next: Record<string, boolean>) {
  localStorage.setItem(todayChecksKey(), JSON.stringify(next))
}

export function ReviewView({
  entries,
  protocol,
  onSave,
}: {
  entries: DailyEntry[]
  protocol?: OscillationProtocol
  onSave: (next: OscillationProtocol) => void
}) {
  const current = useMemo(() => normalizeOscillationProtocol(protocol), [protocol])
  const progress = useMemo(() => cycleProgress(current), [current])
  const rows = useMemo(() => floorRows(entries, current), [entries, current])
  const [draftRaise, setDraftRaise] = useState<CommittedFloors | null>(null)
  const [editing, setEditing] = useState(false)
  const [checks, setChecks] = useState(loadChecks)
  const proposed = (draftRaise ?? Object.fromEntries(rows.map((r) => [r.id, r.proposed]))) as CommittedFloors

  const patch = (partial: Partial<OscillationProtocol>) => {
    onSave({ ...current, ...partial, updatedAt: new Date().toISOString() })
  }

  const raise = () => {
    onSave(closeCycle(current, proposed))
    setDraftRaise(null)
  }

  const toggleCheck = (id: string) => {
    const next = { ...checks, [id]: !checks[id] }
    setChecks(next)
    saveChecks(next)
  }

  const pct = Math.round((progress.elapsed / progress.days) * 100)
  const highLabel = '4h · 80% · TT 60%'
  const lowLabel = `${current.committed.totalWorked}h · ${current.committed.avgFocus}% · TT ${current.committed.timetable}%`
  const goalLabel = '6h · 85% · 85%'

  return (
    <div className="osc-fade-up mx-auto max-w-3xl pb-16">
      <PageHeader
        className="mb-8"
        eyebrow="30 days"
        title={
          <>
            Raise the <span className="italic">floor</span>
          </>
        }
        sub="Wait the window. Don’t change the plan. Then raise the low — never the high."
      />

      <div className="mb-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <MapWave
          high={highLabel}
          low={lowLabel}
          period={`${current.periodDays}d period`}
          goal={goalLabel}
        />
      </div>

      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-bad)]">
            Peak → drop
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]">Skip evening routine. Presence gone.</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
            Kill it: routine on time. Don’t skip sleep to make up work.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: UP }}>
            Rut → climb
          </p>
          <p className="mt-2 text-sm text-[var(--color-text)]">Zero work, huge list, guilt.</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
            Fuel: night routine over distraction. Sleep first, then the day charges.
          </p>
        </Card>
      </div>

      <section className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Today
        </p>
        <div className="space-y-2">
          {CHECKS.map((c) => {
            const on = Boolean(checks[c.id])
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCheck(c.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
                  on
                    ? 'border-[var(--color-border)] bg-[var(--color-surface-overlay)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-overlay)]'
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    on
                      ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span>
                  <span className={`block text-sm ${on ? 'text-[var(--color-muted)] line-through' : 'text-[var(--color-text)]'}`}>
                    {c.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{c.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          This cycle
        </p>
        <Card className="p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-4xl font-medium tabular-nums tracking-tight text-[var(--color-text)]">
                {progress.elapsed}
                <span className="text-xl text-[var(--color-muted)]"> / {progress.days}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {progress.start} → {progress.end}
                {progress.complete ? ' · window closed' : ` · ${progress.remaining} days left`}
              </p>
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {progress.complete ? 'Ready to raise' : 'Wait. Don’t switch strategy.'}
            </p>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
            <div className="h-full rounded-full bg-[var(--color-text)]" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </Card>
      </section>

      <section className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Floors
        </p>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                <th className="px-3 py-2.5 font-semibold">Metric</th>
                <th className="px-3 py-2.5 font-semibold">Commit</th>
                <th className="px-3 py-2.5 font-semibold">Actual</th>
                <th className="px-3 py-2.5 font-semibold">Below</th>
                <th className="px-3 py-2.5 font-semibold">Next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2.5 text-[var(--color-text)]">{row.label}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-muted)]">{row.committedLabel}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-text)]">{row.actualLabel}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-muted)]">
                    {row.samples === 0 ? '—' : `${row.daysBelow}×`}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      step="any"
                      value={proposed[row.id]}
                      onChange={(e) =>
                        setDraftRaise({
                          ...proposed,
                          [row.id]: Number(e.target.value),
                        })
                      }
                      className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm tabular-nums"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={raise} disabled={!progress.complete}>
            Close cycle & raise floor
          </Btn>
          {!progress.complete && (
            <p className="self-center text-xs text-[var(--color-muted)]">Unlocks after day {progress.days}.</p>
          )}
        </div>
      </section>

      {current.history.length > 0 && (
        <section className="mb-10">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Raised
          </p>
          <ul className="space-y-2 text-sm text-[var(--color-muted)]">
            {current.history.map((h) => (
              <li key={h.id}>
                {h.startDate} → {h.endDate}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex justify-center">
        <Pill active={editing} onClick={() => setEditing((v) => !v)}>
          {editing ? 'Hide map notes' : 'Edit map notes'}
        </Pill>
      </div>

      {editing && (
        <div className="space-y-8">
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Define</p>
            <Field label="Activity" value={current.activity} onChange={(activity) => patch({ activity })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="+ Amplitude" value={current.plusAmplitude} onChange={(plusAmplitude) => patch({ plusAmplitude })} />
              <Field label="− Amplitude" value={current.minusAmplitude} onChange={(minusAmplitude) => patch({ minusAmplitude })} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Period (days)
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={current.periodDays}
                onChange={(e) => patch({ periodDays: Number(e.target.value) || 14 })}
                className="w-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm tabular-nums"
              />
            </label>
            <Field label="Output" value={current.output} onChange={(output) => patch({ output })} />
          </section>
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">System</p>
            <Field label="+ Input" value={current.inputsGood} onChange={(inputsGood) => patch({ inputsGood })} />
            <Field label="− Input" value={current.inputsBad} onChange={(inputsBad) => patch({ inputsBad })} />
            <Field label="Feedback delay" value={current.feedbackDelay} onChange={(feedbackDelay) => patch({ feedbackDelay })} />
            <Field label="Shorten delay" value={current.delayFix} onChange={(delayFix) => patch({ delayFix })} />
          </section>
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Loops</p>
            <Field label="Drop trigger" value={current.negativeTrigger} onChange={(negativeTrigger) => patch({ negativeTrigger })} />
            <Field label="How it 2→4→8" value={current.negativeLoop} onChange={(negativeLoop) => patch({ negativeLoop })} />
            <Field label="Anti-trigger" value={current.antiTrigger} onChange={(antiTrigger) => patch({ antiTrigger })} />
            <Field label="Climb trigger" value={current.positiveTrigger} onChange={(positiveTrigger) => patch({ positiveTrigger })} />
            <Field label="How a win scales" value={current.positiveLoop} onChange={(positiveLoop) => patch({ positiveLoop })} />
          </section>
        </div>
      )}
    </div>
  )
}
