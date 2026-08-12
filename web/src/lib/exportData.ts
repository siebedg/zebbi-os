import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { AppState, DailyEntry } from '../types'
import {
  buildAllTimeOscillationReport,
  buildOscillationReport,
  currentMonthKey,
  monthEntries,
} from './oscillation'
import { enrichEntry } from './sessions'
import { isValidDateStr } from './utils'

export type ExportScope = 'month' | 'all' | 'oscillation-month' | 'oscillation-all'

export type ZebbiExportBundle = {
  app: 'zebbi-os'
  generatedAt: string
  scope: ExportScope
  monthKey?: string
  dailyLog: DailyEntry[]
  oscillation?: {
    label: string
    monthKey?: string
    daysWithData: number
    bands: Array<{
      metric: string
      label: string
      floor: string
      high: string
      samples: number
      low: number | null
      highValue: number | null
    }>
  }
  weightLog?: AppState['weightLog']
  summary: {
    days: number
    dateRange?: { from: string; to: string }
    totalNetHours?: number
    avgFocus?: number
  }
}

function enriched(entries: DailyEntry[]): DailyEntry[] {
  return entries.filter((e) => isValidDateStr(e.date)).map(enrichEntry)
}

function monthKeysFrom(entries: DailyEntry[]): string[] {
  const keys = new Set<string>()
  for (const e of entries) {
    if (isValidDateStr(e.date)) keys.add(e.date.slice(0, 7))
  }
  return [...keys].sort()
}

export function buildMonthExport(entries: DailyEntry[], monthKey: string): ZebbiExportBundle {
  const inMonth = enriched(monthEntries(entries, monthKey))
  const netHours = inMonth.reduce((sum, e) => sum + (e.totalHoursNet ?? e.totalDeepWork ?? 0), 0)
  const focusVals = inMonth.map((e) => e.avgFocus).filter((v): v is number => v != null)
  const avgFocus =
    focusVals.length > 0
      ? Math.round(focusVals.reduce((a, b) => a + b, 0) / focusVals.length)
      : undefined

  const osc = buildOscillationReport(entries, monthKey)

  return {
    app: 'zebbi-os',
    generatedAt: new Date().toISOString(),
    scope: 'month',
    monthKey,
    dailyLog: inMonth,
    oscillation: {
      label: osc.label,
      monthKey,
      daysWithData: osc.daysWithData,
      bands: osc.bands.map((b) => ({
        metric: b.metric.id,
        label: b.metric.label,
        floor: b.displayLow,
        high: b.displayHigh,
        samples: b.samples,
        low: b.low,
        highValue: b.high,
      })),
    },
    summary: {
      days: inMonth.length,
      dateRange:
        inMonth.length > 0
          ? { from: inMonth[0].date, to: inMonth[inMonth.length - 1].date }
          : undefined,
      totalNetHours: Math.round(netHours * 100) / 100,
      avgFocus,
    },
  }
}

export function buildAllMonthsExport(entries: DailyEntry[], weightLog?: AppState['weightLog']): ZebbiExportBundle {
  const log = enriched(entries)
  const keys = monthKeysFrom(log)

  return {
    app: 'zebbi-os',
    generatedAt: new Date().toISOString(),
    scope: 'all',
    dailyLog: log,
    weightLog,
    summary: {
      days: log.length,
      dateRange:
        log.length > 0 ? { from: log[0].date, to: log[log.length - 1].date } : undefined,
      totalNetHours: Math.round(
        log.reduce((sum, e) => sum + (e.totalHoursNet ?? e.totalDeepWork ?? 0), 0) * 100,
      ) / 100,
    },
    oscillation: {
      label: 'Per month floors',
      daysWithData: log.length,
      bands: keys.flatMap((monthKey) => {
        const report = buildOscillationReport(entries, monthKey)
        return report.bands.map((b) => ({
          metric: `${monthKey}:${b.metric.id}`,
          label: `${report.label} · ${b.metric.label}`,
          floor: b.displayLow,
          high: b.displayHigh,
          samples: b.samples,
          low: b.low,
          highValue: b.high,
        }))
      }),
    },
  }
}

export function buildOscillationExport(
  entries: DailyEntry[],
  monthKey?: string,
): ZebbiExportBundle {
  const key = monthKey ?? currentMonthKey()
  const report = monthKey ? buildOscillationReport(entries, key) : null
  const allTime = buildAllTimeOscillationReport(entries)

  const bands = report
    ? report.bands.map((b) => ({
        metric: b.metric.id,
        label: `${report.label} · ${b.metric.label}`,
        floor: b.displayLow,
        high: b.displayHigh,
        samples: b.samples,
        low: b.low,
        highValue: b.high,
      }))
    : []

  const allBands = allTime.bands.map((b) => ({
    metric: `all:${b.metric.id}`,
    label: `All time · ${b.metric.label}`,
    floor: b.displayLow,
    high: b.displayHigh,
    samples: b.samples,
    low: b.low,
    highValue: b.high,
  }))

  return {
    app: 'zebbi-os',
    generatedAt: new Date().toISOString(),
    scope: monthKey ? 'oscillation-month' : 'oscillation-all',
    monthKey: monthKey ?? undefined,
    dailyLog: [],
    oscillation: {
      label: monthKey ? report!.label : 'Oscillation snapshot',
      monthKey: monthKey ?? undefined,
      daysWithData: monthKey ? report!.daysWithData : allTime.daysWithData,
      bands: [...bands, ...allBands],
    },
    summary: { days: monthKey ? report!.daysWithData : allTime.daysWithData },
  }
}

export function exportToJson(bundle: ZebbiExportBundle): string {
  return JSON.stringify(bundle, null, 2)
}

export function exportToMarkdown(bundle: ZebbiExportBundle): string {
  const lines: string[] = [
    '# Zebbi OS export',
    '',
    `- Generated: ${bundle.generatedAt}`,
    `- Scope: ${bundle.scope}`,
    bundle.monthKey ? `- Month: ${bundle.monthKey}` : '',
    '',
    '## Summary',
    `- Days: ${bundle.summary.days}`,
    bundle.summary.dateRange
      ? `- Range: ${bundle.summary.dateRange.from} → ${bundle.summary.dateRange.to}`
      : '',
    bundle.summary.totalNetHours != null ? `- Total net hours: ${bundle.summary.totalNetHours}u` : '',
    bundle.summary.avgFocus != null ? `- Avg focus: ${bundle.summary.avgFocus}%` : '',
    '',
  ].filter(Boolean)

  if (bundle.oscillation) {
    lines.push('## Oscillation / baselines', '')
    lines.push(`Period: ${bundle.oscillation.label}`, '')
    lines.push('| Metric | Floor | High | Samples |', '| --- | --- | --- | --- |')
    for (const b of bundle.oscillation.bands) {
      lines.push(`| ${b.label} | ${b.floor} | ${b.high} | ${b.samples} |`)
    }
    lines.push('')
  }

  if (bundle.dailyLog.length > 0) {
    lines.push('## Daily log', '')
    for (const e of bundle.dailyLog) {
      const label = format(parseISO(e.date), 'd MMM yyyy', { locale: nl })
      lines.push(
        `### ${label}`,
        `- Net worked: ${e.totalHoursNet ?? e.totalDeepWork ?? '—'}u`,
        `- Focus: ${e.avgFocus ?? '—'}%`,
        `- Timetable: ${e.timetable ?? '—'}%`,
        `- Meditation: ${e.meditation ?? '—'} min`,
        `- Sleep: ${e.sleepHours ?? '—'}h (score ${e.sleepScore ?? '—'})`,
        '',
      )
    }
  }

  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
