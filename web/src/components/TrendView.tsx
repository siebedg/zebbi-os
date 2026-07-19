import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import {
  buildOscillationReport,
  currentMonthKey,
  type OscillationBand,
} from '../lib/oscillation'
import { Card, SectionTitle } from './ui'

function BandCard({ band }: { band: OscillationBand }) {
  const { low, high, metric } = band
  const span = low != null && high != null && high > low ? high - low : 0
  const midPct = span > 0 && low != null && high != null ? 50 : 50

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{metric.label}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{band.samples} metingen</p>
        </div>
        <span className="rounded-md bg-[var(--color-surface-overlay)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          band
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-overlay)] px-3 py-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">Low</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{band.displayLow}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">absolute floor</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-overlay)] px-3 py-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">High</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-text)]">{band.displayHigh}</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">typical top</p>
        </div>
      </div>

      {low != null && high != null && (
        <div className="mt-4">
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]/70"
              style={{ width: `${midPct + 50}%`, maxWidth: '100%' }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-[var(--color-muted)]">
            <span>{band.displayLow}</span>
            <span className="text-[var(--color-text)]/70">oscillation</span>
            <span>{band.displayHigh}</span>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-muted)]">{band.hint}</p>
    </div>
  )
}

export function TrendView({ entries }: { entries: DailyEntry[] }) {
  const [monthKey, setMonthKey] = useState(() => currentMonthKey())

  const report = useMemo(() => buildOscillationReport(entries, monthKey), [entries, monthKey])

  const shiftMonth = (delta: number) => {
    const d = delta < 0 ? subMonths(parseISO(`${monthKey}-01`), 1) : addMonths(parseISO(`${monthKey}-01`), 1)
    setMonthKey(format(d, 'yyyy-MM'))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle sub="Low = herhaalde floor (exceptions genegeerd). Verhoog je low om de baseline te tillen.">
          Oscillation
        </SectionTitle>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)]"
            aria-label="Vorige maand"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium capitalize text-[var(--color-text)]">
            {report.label}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)]"
            aria-label="Volgende maand"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <p className="text-sm text-[var(--color-text)]">
          <span className="font-semibold tabular-nums">{report.daysWithData}</span>
          <span className="text-[var(--color-muted)]"> / {report.daysInMonth} dagen met data</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          Een low point is je absolute standaard — daar ga je niet onder. Zeldzame dips (1–2×) tellen niet mee.
          Als low easy aanvoelt, til je hem rustig op i.p.v. wild te oscilleren.
        </p>
      </Card>

      {report.bands.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
          Nog te weinig data in deze maand voor oscillation bands.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {report.bands.map((band) => (
            <BandCard key={band.metric.id} band={band} />
          ))}
        </div>
      )}
    </div>
  )
}
