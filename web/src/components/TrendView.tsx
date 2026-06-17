import { useMemo } from 'react'
import type { DailyEntry } from '../types'
import { Card, SectionTitle } from './ui'
import {
  TREND_COLUMNS,
  buildMonthlySummaries,
  metricDelta,
  type MonthSummary,
} from '../lib/monthlyStats'

function Delta({ improved, text }: { improved: boolean | null; text: string }) {
  if (!text || text === '·') return null
  const color =
    improved === true
      ? 'text-[var(--color-good)]'
      : improved === false
        ? 'text-[var(--color-bad)]'
        : 'text-[var(--color-muted)]'
  return <span className={`block text-[9px] font-medium leading-none ${color}`}>{text}</span>
}

function MonthRow({ row, prev }: { row: MonthSummary; prev?: MonthSummary }) {
  return (
    <tr className="border-b border-[var(--color-border)] last:border-0">
      <td className="px-2 py-2.5 font-medium capitalize text-[var(--color-text)]">{row.label}</td>
      <td className="px-2 py-2.5 text-center text-[var(--color-muted)]">{row.daysLogged}</td>
      {TREND_COLUMNS.map(({ key }) => {
        const m = row.metrics[key]
        const d = metricDelta(prev?.metrics[key], m)
        return (
          <td key={key} className="px-1.5 py-2.5 text-center">
            <span className="text-[var(--color-text)]">{m.display}</span>
            {prev && <Delta improved={d.improved} text={d.text} />}
          </td>
        )
      })}
    </tr>
  )
}

export function TrendView({ entries }: { entries: DailyEntry[] }) {
  const summaries = useMemo(() => buildMonthlySummaries(entries), [entries])

  if (summaries.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
        Nog geen maanden met data — log dagen om trends te zien.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <SectionTitle sub="Maandgemiddelden per metric. Kleine Δ = verschil t.o.v. vorige maand.">
        Trend
      </SectionTitle>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] text-left text-[var(--color-muted)]">
              <th className="px-2 py-2 font-medium">Maand</th>
              <th className="w-8 px-2 py-2 text-center font-medium" title="Dagen met data">
                d
              </th>
              {TREND_COLUMNS.map((c) => (
                <th key={c.key} className="px-1.5 py-2 text-center font-medium">
                  {c.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map((row, i) => (
              <MonthRow key={row.monthKey} row={row} prev={i > 0 ? summaries[i - 1] : undefined} />
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-[var(--color-muted)]">
        Wake: eerder = groen. Overige metrics: hoger = groen. Alleen dagen met ingevulde waarden tellen mee.
      </p>
    </div>
  )
}
