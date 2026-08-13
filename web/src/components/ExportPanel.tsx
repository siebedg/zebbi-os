import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Copy, Download } from 'lucide-react'
import type { DailyEntry, WeightEntry } from '../types'
import { currentMonthKey } from '../lib/oscillation'
import {
  buildAllMonthsExport,
  buildMonthExport,
  buildOscillationExport,
  downloadTextFile,
  exportToJson,
  exportToMarkdown,
} from '../lib/exportData'
import { isValidDateStr } from '../lib/utils'
import { Btn, Card } from './ui'

export function ExportPanel({
  entries,
  weightLog,
  embedded = false,
}: {
  entries: DailyEntry[]
  weightLog?: WeightEntry[]
  embedded?: boolean
}) {
  const monthKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const e of entries) {
      if (isValidDateStr(e.date)) keys.add(e.date.slice(0, 7))
    }
    return [...keys].sort().reverse()
  }, [entries])

  const [monthKey, setMonthKey] = useState(() => monthKeys[0] ?? currentMonthKey())
  const [msg, setMsg] = useState<string | null>(null)

  const monthLabel = (key: string) => {
    try {
      return format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: nl })
    } catch {
      return key
    }
  }

  const flash = (text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(null), 2000)
  }

  const copyMarkdown = async (scope: 'month' | 'all' | 'osc') => {
    const bundle =
      scope === 'month'
        ? buildMonthExport(entries, monthKey)
        : scope === 'all'
          ? buildAllMonthsExport(entries, weightLog)
          : buildOscillationExport(entries, monthKey)
    await navigator.clipboard.writeText(exportToMarkdown(bundle))
    flash('Markdown gekopieerd')
  }

  const downloadJson = (scope: 'month' | 'all' | 'osc') => {
    const bundle =
      scope === 'month'
        ? buildMonthExport(entries, monthKey)
        : scope === 'all'
          ? buildAllMonthsExport(entries, weightLog)
          : buildOscillationExport(entries, monthKey)
    const name =
      scope === 'month'
        ? `zebbi-${monthKey}.json`
        : scope === 'all'
          ? 'zebbi-all.json'
          : `zebbi-oscillation-${monthKey}.json`
    downloadTextFile(name, exportToJson(bundle), 'application/json')
    flash('Download gestart')
  }

  const body = (
    <Card className="p-5 sm:p-6">
      {!embedded && (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Data
        </p>
      )}

      {monthKeys.length > 0 && (
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Maand
          </span>
          <select
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text)]/40"
          >
            {monthKeys.map((k) => (
              <option key={k} value={k}>{monthLabel(k)}</option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" className="!text-xs" onClick={() => downloadJson('month')}>
            <Download className="h-3.5 w-3.5" />
            Maand JSON
          </Btn>
          <Btn variant="ghost" className="!text-xs" onClick={() => copyMarkdown('month')}>
            <Copy className="h-3.5 w-3.5" />
            Maand MD
          </Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" className="!text-xs" onClick={() => downloadJson('all')}>
            <Download className="h-3.5 w-3.5" />
            Alle maanden JSON
          </Btn>
          <Btn variant="ghost" className="!text-xs" onClick={() => copyMarkdown('all')}>
            <Copy className="h-3.5 w-3.5" />
            Alle maanden MD
          </Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" className="!text-xs" onClick={() => downloadJson('osc')}>
            <Download className="h-3.5 w-3.5" />
            Oscillation JSON
          </Btn>
          <Btn variant="ghost" className="!text-xs" onClick={() => copyMarkdown('osc')}>
            <Copy className="h-3.5 w-3.5" />
            Oscillation MD
          </Btn>
        </div>
      </div>

      {msg && <p className="mt-3 text-xs text-[var(--color-good)]">{msg}</p>}
    </Card>
  )

  if (embedded) return body

  return (
    <div className="osc-fade-up mx-auto max-w-lg space-y-8 pb-12">
      {body}
    </div>
  )
}
