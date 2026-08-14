import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { CommittedFloors, DailyEntry, OscillationProtocol } from '../types'
import { cycleProgress, floorRows, closeCycle, normalizeOscillationProtocol } from '../lib/oscillationProtocol'
import { useTheme } from '../hooks/useTheme'
import { Btn, Card, PageHeader, Pill } from './ui'

const UP = '#2dd4bf'
const DOWN = '#f472b6'
const W = 1000
const H = 380
const PAD_L = 48
const PAD_R = 48
const PAD_T = 24
const PAD_B = 24
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B
const MID_Y = PAD_T + PLOT_H / 2
const AMP = PLOT_H * 0.42

/** One cycle, trough → peak → trough. */
function waveY(t: number) {
  const phase = -Math.PI / 2 + t * Math.PI * 2
  return MID_Y - Math.sin(phase) * AMP
}

function wavePath() {
  const n = 96
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = PAD_L + t * PLOT_W
    const y = waveY(t)
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }
  return d
}

function MapWave() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const d = useMemo(() => wavePath(), [])
  const peak = { x: PAD_L + 0.5 * PLOT_W, y: waveY(0.5) }
  const left = { x: PAD_L, y: waveY(0) }
  const right = { x: PAD_L + PLOT_W, y: waveY(1) }
  const grid = dark ? '#27272a' : '#e4e4e7'
  const line = dark ? '#fafafa' : '#18181b'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Oscillation">
      <line
        x1={PAD_L}
        y1={MID_Y}
        x2={PAD_L + PLOT_W}
        y2={MID_Y}
        stroke={line}
        strokeOpacity={0.12}
        strokeDasharray="5 8"
      />
      <path d={d} fill="none" stroke={grid} strokeWidth="10" strokeLinecap="round" />
      <path d={d} fill="none" stroke={line} strokeWidth="2.25" strokeLinecap="round" />
      <circle cx={left.x} cy={left.y} r="5" fill={DOWN} />
      <circle cx={peak.x} cy={peak.y} r="5" fill={UP} />
      <circle cx={right.x} cy={right.y} r="5" fill={DOWN} />
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

function shortDate(iso: string) {
  try {
    return format(parseISO(iso), 'd MMM')
  } catch {
    return iso
  }
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
  const proposed = (draftRaise ?? Object.fromEntries(rows.map((r) => [r.id, r.proposed]))) as CommittedFloors

  const patch = (partial: Partial<OscillationProtocol>) => {
    onSave({ ...current, ...partial, updatedAt: new Date().toISOString() })
  }

  const raise = () => {
    onSave(closeCycle(current, proposed))
    setDraftRaise(null)
  }

  const pct = Math.round((progress.elapsed / progress.days) * 100)
  const highLabel = '4h · 80% focus · TT 60%'
  const lowLabel = `${current.committed.totalWorked}h · ${current.committed.avgFocus}% · TT ${current.committed.timetable}%`

  return (
    <div className="osc-fade-up mx-auto max-w-3xl pb-16">
      <PageHeader
        className="mb-10"
        title={
          <>
            Overcoming Oscillations <span className="italic">Hell</span>
          </>
        }
      />

      <div className="mb-3 overflow-hidden">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">High</p>
          <p className="mt-1 font-display text-xl font-medium tracking-tight text-[var(--color-text)]">{highLabel}</p>
        </div>
        <MapWave />
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Floor</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-[var(--color-text)]">{lowLabel}</p>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            {current.periodDays}d cycle · goal 6h · 85% · 85%
          </p>
        </div>
      </div>

      <div className="mb-10 mt-8 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-bad)]">
            When I’m on a roll
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
            Evening routine late, or I’m not present. Then I’m not even aware I’m not aware — sleep slips, wake later, bed later.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Evening routine on time. If presence drops, that’s the drop. Don’t skip sleep to make up work.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: UP }}>
            When I’m in a rut
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
            Close to zero work, huge todo list, guilt. Opening Insta, not here. Day after day.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Night routine over distraction. Sleep first — then I’m charged the next day.
          </p>
        </Card>
      </div>

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
                {shortDate(progress.start)} → {shortDate(progress.end)}
                {progress.complete ? ' · window done' : ` · ${progress.remaining} days left`}
              </p>
            </div>
            <p className="max-w-[16rem] text-right text-sm leading-relaxed text-[var(--color-muted)]">
              {progress.complete
                ? 'Enough data. Raise the floor — not the high.'
                : 'Keep the same plan. Don’t add or drop habits. One day is noise.'}
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
            <p className="self-center text-xs text-[var(--color-muted)]">After day {progress.days}.</p>
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
                {shortDate(h.startDate)} → {shortDate(h.endDate)}
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
