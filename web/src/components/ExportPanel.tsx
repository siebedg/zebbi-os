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
import { Btn, Card, SectionTitle } from './ui'

export function ExportPanel({
  entries,
  weightLog,
}: {
  entries: DailyEntry[]
  weightLog?: WeightEntry[]
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

  return (
    <Card className="p-4">
      <SectionTitle sub="AI-ready context — daily log, baselines, floors.">
        Export
      </SectionTitle>

      {monthKeys.length > 0 && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-[var(--color-muted)]">Maand</span>
          <select
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
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
}
