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
  direction: 'higher' | 'lower'
}

export type OscillationBand = {
  metric: OscillationMetric
  low: number | null
  high: number | null
  samples: number
  outliersLow: number
  outliersHigh: number
  ignoredBelow: number
  displayLow: string
  displayHigh: string
  hint: string
}

/** DW4/5 omitted from oscillation pills — keep DW1–3. */
export const OSCILLATION_METRICS: OscillationMetric[] = [
  { id: 'meditation', label: 'Meditatie', unit: 'min', direction: 'higher' },
  { id: 'deepWork1', label: 'Deep work 1', unit: 'min', direction: 'higher' },
  { id: 'deepWork2', label: 'Deep work 2', unit: 'min', direction: 'higher' },
  { id: 'deepWork3', label: 'Deep work 3', unit: 'min', direction: 'higher' },
  { id: 'avgFocus', label: 'Focus', unit: '%', direction: 'higher' },
  { id: 'totalWorked', label: 'Totaal deep work', unit: 'uur', direction: 'higher' },
  { id: 'sleepScore', label: 'Sleep score', unit: '%', direction: 'higher' },
  { id: 'sleepHours', label: 'Slaapuren', unit: 'uur', direction: 'higher' },
  { id: 'timetable', label: 'Timetable', unit: '%', direction: 'higher' },
]

/** Max times a rare extreme may appear and still count as exception (not the floor/ceiling). */
const MAX_EXCEPTION_OCCURRENCES = 2

function quantize(metricId: string, value: number): number {
  if (metricId.startsWith('deepWork')) {
    // Bucket so 73/77 both become 75 — matches “75 min low / 2u high”
    return Math.round(value / 5) * 5
  }
  if (metricId === 'meditation') return Math.round(value)
  if (metricId === 'avgFocus' || metricId === 'sleepScore' || metricId === 'timetable') {
    return Math.round(value / 5) * 5
  }
  if (metricId === 'totalWorked' || metricId === 'sleepHours') {
    return Math.round(value * 4) / 4
  }
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

function getDeepWorkMinutes(e: DailyEntry, index0: number): number | null {
  const sessions = (e.sessions ?? []).filter((s) => s.startTime && s.endTime)
  if (sessions[index0]) {
    const mins = sessionDurationMinutes(sessions[index0])
    if (mins > 0) return mins
  }
  // Duration-only sessions (no clock times)
  const all = e.sessions ?? []
  const withDuration = all.filter((s) => (s.durationHours ?? 0) > 0 || (s.startTime && s.endTime))
  if (withDuration[index0]) {
    const mins = sessionDurationMinutes(withDuration[index0])
    if (mins > 0) return mins
  }
  const legacy = e[`deepWork${index0 + 1}` as keyof DailyEntry]
  if (typeof legacy === 'number' && legacy > 0) {
    // Stored as hours in month grid / import
    return Math.round(legacy * 60)
  }
  return null
}

function getMetricValue(e: DailyEntry, metricId: string): number | null {
  if (isRestDay(e) && metricId.startsWith('deepWork')) return null
  if (isRestDay(e) && (metricId === 'totalWorked' || metricId === 'avgFocus' || metricId === 'timetable')) {
    return null
  }
  if (metricId === 'meditation') {
    return e.meditation != null && e.meditation > 0 ? e.meditation : null
  }
  if (metricId === 'avgFocus') return e.avgFocus ?? null
  if (metricId === 'timetable') return e.timetable ?? null
  if (metricId === 'sleepHours') return e.sleepHours ?? null
  if (metricId === 'sleepScore') {
    if (e.sleepScore == null) return null
    return e.sleepScore <= 1 ? e.sleepScore * 100 : e.sleepScore
  }
  if (metricId === 'totalWorked') {
    const v = e.totalHoursWorked ?? e.totalDeepWork
    return v != null && v > 0 ? v : null
  }
  const dwMatch = metricId.match(/^deepWork(\d)$/)
  if (dwMatch) {
    return getDeepWorkMinutes(e, parseInt(dwMatch[1], 10) - 1)
  }
  return null
}

function collectMetricValues(entries: DailyEntry[], metricId: string): number[] {
  const values: number[] = []
  for (const raw of entries) {
    if (!isValidDateStr(raw.date)) continue
    const v = getMetricValue(enrichEntry(raw), metricId)
    if (v != null && Number.isFinite(v) && v > 0) values.push(v)
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
      value: quantize(metricId, v),
    })
  }
  return points
}

export { formatValue as formatOscillationValue }

/**
 * Low = absolute repeating floor (ignore 1–2× rare dips).
 * High = repeating ceiling (ignore 1–2× rare spikes).
 * Matches: “1× of 2× 1 min meditatie is exception; low is 3 min because that repeated.”
 */
export function oscillationBandFromValues(
  metric: OscillationMetric,
  rawValues: number[],
): OscillationBand {
  const values = rawValues
    .map((v) => quantize(metric.id, v))
    .filter((v) => Number.isFinite(v) && v > 0)

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
  if (values.length < 2) return empty

  const freq = new Map<number, number>()
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1)

  const uniqueAsc = [...freq.keys()].sort((a, b) => a - b)

  /**
   * Walk from an extreme. Skip values that appear ≤2 times (exceptions),
   * until we hit a value that appears >2 times (established), or fall back.
   */
  function establishedFromEnd(fromLow: boolean): { value: number; skipped: number } {
    const ordered = fromLow ? uniqueAsc : [...uniqueAsc].reverse()
    let skipped = 0

    // 1) Prefer clearly established values (appear 3+)
    for (const v of ordered) {
      const c = freq.get(v) ?? 0
      if (c > MAX_EXCEPTION_OCCURRENCES) return { value: v, skipped }
      // rare extreme — burn exception budget
      if (skipped + c <= MAX_EXCEPTION_OCCURRENCES) {
        skipped += c
        continue
      }
      // exception budget full — this value becomes the floor/ceiling even if rare
      return { value: v, skipped }
    }

    // 2) Nothing appeared 3+ times: use values that appear at least twice
    const twice = uniqueAsc.filter((v) => (freq.get(v) ?? 0) >= 2)
    if (twice.length > 0) {
      return { value: fromLow ? twice[0] : twice[twice.length - 1], skipped }
    }

    // 3) All unique: drop up to 2 samples from this end
    const sorted = [...values].sort((a, b) => a - b)
    const drop = Math.min(MAX_EXCEPTION_OCCURRENCES, Math.max(0, sorted.length - 1))
    return {
      value: fromLow ? sorted[drop] : sorted[sorted.length - 1 - drop],
      skipped: drop,
    }
  }

  const lowResult = establishedFromEnd(true)
  const highResult = establishedFromEnd(false)
  let low = lowResult.value
  let high = highResult.value
  if (high < low) {
    // Degenerate month — use plain min/max after light trim
    const sorted = [...values].sort((a, b) => a - b)
    const drop = Math.min(1, Math.max(0, sorted.length - 1))
    low = sorted[drop]
    high = sorted[sorted.length - 1 - drop]
  }

  const ignoredBelow = values.filter((v) => v < low).length
  const outliersHigh = values.filter((v) => v > high).length

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
    hint:
      ignoredBelow || outliersHigh
        ? `${ignoredBelow}× onder low · ${outliersHigh}× boven high genegeerd`
        : 'Geen exceptions',
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
  ).filter((b) => b.low != null && b.high != null)

  return {
    monthKey,
    label: monthLabel(monthKey),
    daysInMonth,
    daysWithData,
    bands,
  }
}
