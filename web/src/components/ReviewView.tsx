import { useMemo, useState } from 'react'
import type { CommittedFloors, DailyEntry, OscillationProtocol } from '../types'
import { cycleProgress, floorRows, closeCycle, normalizeOscillationProtocol } from '../lib/oscillationProtocol'
import { Btn, Card, PageHeader } from './ui'

function Field({
  label,
  value,
  onChange,
  rows = 3,
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
  const proposed = draftRaise ?? Object.fromEntries(rows.map((r) => [r.id, r.proposed])) as CommittedFloors

  const patch = (partial: Partial<OscillationProtocol>) => {
    onSave({ ...current, ...partial, updatedAt: new Date().toISOString() })
  }

  const raise = () => {
    onSave(closeCycle(current, proposed))
    setDraftRaise(null)
  }

  const pct = Math.round((progress.elapsed / progress.days) * 100)

  return (
    <div className="osc-fade-up mx-auto max-w-2xl pb-16">
      <PageHeader
        className="mb-10"
        eyebrow="30 days"
        title={
          <>
            Raise the <span className="italic">floor</span>
          </>
        }
        sub="Law of large numbers: wait 30 days, don’t change the plan, then raise the low point. Peak is noise. Floor is progress."
      />

      {current.antiTrigger && (
        <Card className="mb-8 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Anti-trigger
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">{current.antiTrigger}</p>
        </Card>
      )}

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
            <div
              className="h-full rounded-full bg-[var(--color-text)]"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
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
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          Actual = repeating low this window (1–2 rare dips ignored). Raise only the low point, never the high.
        </p>
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

      <section className="mb-10 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Define
        </p>
        <Field label="Activity" value={current.activity} rows={2} onChange={(activity) => patch({ activity })} />
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

      <section className="mb-10 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          System
        </p>
        <Field label="+ Input" value={current.inputsGood} rows={2} onChange={(inputsGood) => patch({ inputsGood })} />
        <Field label="− Input" value={current.inputsBad} rows={2} onChange={(inputsBad) => patch({ inputsBad })} />
        <Field label="Feedback delay" value={current.feedbackDelay} onChange={(feedbackDelay) => patch({ feedbackDelay })} />
        <Field label="Shorten delay" value={current.delayFix} onChange={(delayFix) => patch({ delayFix })} />
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Loops
        </p>
        <Field
          label="Drop trigger"
          value={current.negativeTrigger}
          onChange={(negativeTrigger) => patch({ negativeTrigger })}
        />
        <Field label="How it 2→4→8" value={current.negativeLoop} onChange={(negativeLoop) => patch({ negativeLoop })} />
        <Field label="Anti-trigger" value={current.antiTrigger} onChange={(antiTrigger) => patch({ antiTrigger })} />
        <Field
          label="Climb trigger"
          value={current.positiveTrigger}
          onChange={(positiveTrigger) => patch({ positiveTrigger })}
        />
        <Field label="How a win scales" value={current.positiveLoop} onChange={(positiveLoop) => patch({ positiveLoop })} />
      </section>
    </div>
  )
}
