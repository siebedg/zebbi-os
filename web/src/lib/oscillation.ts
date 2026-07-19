import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import type { DailyEntry } from '../types'
import { enrichEntry, sessionDurationMinutes } from './sessions'
import { isRestDay } from './restDays'
import { isValidDateStr } from './utils'

export type OscillationUnit = 'min' | 'uur' | '%' | 'pag'

export type OscillationMetric = {
  id: string
  label: string
  unit: OscillationUnit
  /** Higher low-point = improvement for baseline */
  direction: 'higher' | 'lower'
}

export type OscillationBand = {
  metric: OscillationMetric
  low: number | null
  high: number | null
  samples: number
  outliersLow: number
  outliersHigh: number
  /** Values below low that were ignored as exceptions */
  ignoredBelow: number
  displayLow: string
  displayHigh: string
  hint: string
}

export const OSCILLATION_METRICS: OscillationMetric[] = [
  { id: 'meditation', label: 'Meditatie', unit: 'min', direction: 'higher' },
  { id: 'deepWork1', label: 'Deep work 1', unit: 'min', direction: 'higher' },
  { id: 'deepWork2', label: 'Deep work 2', unit: 'min', direction: 'higher' },
  { id: 'deepWork3', label: 'Deep work 3', unit: 'min', direction: 'higher' },
  { id: 'deepWork4', label: 'Deep work 4', unit: 'min', direction: 'higher' },
  { id: 'deepWork5', label: 'Deep work 5', unit: 'min', direction: 'higher' },
  { id: 'avgFocus', label: 'Focus', unit: '%', direction: 'higher' },
  { id: 'totalWorked', label: 'Totaal deep work', unit: 'uur', direction: 'higher' },
  { id: 'sleepScore', label: 'Sleep score', unit: '%', direction: 'higher' },
  { id: 'sleepHours', label: 'Slaapuren', unit: 'uur', direction: 'higher' },
  { id: 'timetable', label: 'Timetable', unit: '%', direction: 'higher' },
]

function roundForMetric(id: string, value: number): number {
  if (id.startsWith('deepWork') || id === 'meditation') return Math.round(value)
  if (id === 'avgFocus' || id === 'sleepScore' || id === 'timetable') return Math.round(value)
  if (id === 'totalWorked' || id === 'sleepHours') return Math.round(value * 4) / 4
  return Math.round(value * 10) / 10
}

function formatValue(value: number, unit: OscillationUnit): string {
  if (unit === 'min') {
    if (value >= 60) {
      const h = Math.floor(value / 60)
      const m = Math.round(value % 60)
      return m === 0 ? `${h}u` : `${h}u ${m}m`
    }
    return `${Math.round(value)} min`
  }
  if (unit === '%') return `${Math.round(value)}%`
  if (unit === 'uur') return `${value}u`
  return String(value)
}

function getMetricValue(e: DailyEntry, metricId: string): number | null {
  if (isRestDay(e) && metricId.startsWith('deepWork')) return null
  if (isRestDay(e) && (metricId === 'totalWorked' || metricId === 'avgFocus' || metricId === 'timetable')) {
    return null
  }
  if (metricId === 'meditation') return e.meditation ?? null
  if (metricId === 'avgFocus') return e.avgFocus ?? null
  if (metricId === 'timetable') return e.timetable ?? null
  if (metricId === 'sleepHours') return e.sleepHours ?? null
  if (metricId === 'sleepScore') {
    if (e.sleepScore == null) return null
    return e.sleepScore <= 1 ? e.sleepScore * 100 : e.sleepScore
  }
  if (metricId === 'totalWorked') {
    const v = e.totalHoursWorked ?? e.totalDeepWork
    return v ?? null
  }
  const dwMatch = metricId.match(/^deepWork(\d)$/)
  if (dwMatch) {
    const idx = parseInt(dwMatch[1], 10) - 1
    const sessions = (e.sessions ?? []).filter((s) => s.startTime && s.endTime)
    if (sessions[idx]) {
      const mins = sessionDurationMinutes(sessions[idx])
      return mins > 0 ? mins : null
    }
    const legacy = e[`deepWork${idx + 1}` as keyof DailyEntry] as number | undefined
    if (legacy != null && legacy > 0) return Math.round(legacy * 60)
  }
  return null
}

function collectMetricValues(entries: DailyEntry[], metricId: string): number[] {
  const values: number[] = []
  for (const raw of entries) {
    if (!isValidDateStr(raw.date)) continue
    const v = getMetricValue(enrichEntry(raw), metricId)
    if (v != null) values.push(v)
  }
  return values
}

export type OscillationPoint = { date: string; label: string; value: number }

export function collectMetricSeries(entries: DailyEntry[], metricId: string): OscillationPoint[] {
  const points: OscillationPoint[] = []
  for (const raw of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!isValidDateStr(raw.date)) continue
    const v = getMetricValue(enrichEntry(raw), metricId)
    if (v == null) continue
    points.push({
      date: raw.date,
      label: format(parseISO(raw.date), 'd/M', { locale: nl }),
      value: roundForMetric(metricId, v),
    })
  }
  return points
}

export { formatValue as formatOscillationValue }

/**
 * Low/high from oscillation: ignore rare extremes (1–2 exceptions),
 * keep the floor/ceiling that actually repeats.
 */
export function oscillationBandFromValues(
  metric: OscillationMetric,
  rawValues: number[],
): OscillationBand {
  const values = rawValues.map((v) => roundForMetric(metric.id, v)).filter((v) => Number.isFinite(v))
  const empty: OscillationBand = {
    metric,
    low: null,
    high: null,
    samples: values.length,
    outliersLow: 0,
    outliersHigh: 0,
    ignoredBelow: 0,
    displayLow: '—',
    displayHigh: '—',
    hint: 'Te weinig data',
  }
  if (values.length < 3) return empty

  const freq = new Map<number, number>()
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1)

  // Must appear at least twice, or ~15% of samples (whichever is higher, capped reasonably)
  const minCount = Math.max(2, Math.min(4, Math.ceil(values.length * 0.15)))
  const established = [...freq.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([v]) => v)
    .sort((a, b) => a - b)

  let low: number
  let high: number
  let ignoredBelow = 0
  let outliersHigh = 0

  if (established.length === 0) {
    // Fall back: drop single-occurrence extremes at both ends
    const sorted = [...values].sort((a, b) => a - b)
    const withoutRareEnds = sorted.filter((v) => (freq.get(v) ?? 0) >= 2)
    const pool = withoutRareEnds.length >= 2 ? withoutRareEnds : sorted
    low = pool[0]
    high = pool[pool.length - 1]
    ignoredBelow = sorted.filter((v) => v < low).length
    outliersHigh = sorted.filter((v) => v > high).length
  } else {
    low = established[0]
    high = established[established.length - 1]
    ignoredBelow = values.filter((v) => v < low).length
    outliersHigh = values.filter((v) => v > high).length
  }

  const hintParts: string[] = []
  if (ignoredBelow > 0) {
    hintParts.push(`${ignoredBelow}× onder low genegeerd (exceptions)`)
  }
  if (outliersHigh > 0) {
    hintParts.push(`${outliersHigh}× boven high`)
  }
  hintParts.push(`min. ${minCount}× om te tellen`)

  return {
    metric,
    low,
    high,
    samples: values.length,
    outliersLow: ignoredBelow,
    outliersHigh,
    ignoredBelow,
    displayLow: formatValue(low, metric.unit),
    displayHigh: formatValue(high, metric.unit),
    hint: hintParts.join(' · '),
  }
}

export function monthEntries(entries: DailyEntry[], monthKey: string): DailyEntry[] {
  return entries.filter((e) => e.date.startsWith(monthKey) && isValidDateStr(e.date))
}

export function currentMonthKey(ref = new Date()): string {
  return format(ref, 'yyyy-MM')
}

export function monthLabel(monthKey: string): string {
  try {
    return format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: nl })
  } catch {
    return monthKey
  }
}

export function buildOscillationReport(
  entries: DailyEntry[],
  monthKey: string,
): { monthKey: string; label: string; daysInMonth: number; daysWithData: number; bands: OscillationBand[] } {
  const inMonth = monthEntries(entries, monthKey)
  const start = startOfMonth(parseISO(`${monthKey}-01`))
  const end = endOfMonth(start)
  const daysInMonth = eachDayOfInterval({ start, end }).length
  const daysWithData = new Set(inMonth.map((e) => e.date)).size

  const bands = OSCILLATION_METRICS.map((metric) =>
    oscillationBandFromValues(metric, collectMetricValues(inMonth, metric.id)),
  ).filter((b) => b.samples > 0)

  return {
    monthKey,
    label: monthLabel(monthKey),
    daysInMonth,
    daysWithData,
    bands,
  }
}
