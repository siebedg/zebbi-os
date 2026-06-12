import { format, parseISO, startOfMonth } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { DailyEntry } from '../types'
import { SLEEP_SCORE_TRACKED_FROM } from '../types'
import { enrichEntry } from './sessions'
import { entryHasData, parseTimeToMinutes } from './utils'

const FIRST_MONTH = startOfMonth(new Date(2025, 11, 1))

export type MetricKey =
  | 'wake'
  | 'sleepHours'
  | 'sleepScore'
  | 'meditation'
  | 'gratitude'
  | 'exercise'
  | 'focus'
  | 'deepWork'
  | 'timetable'

export type MetricDirection = 'higher' | 'lower'

export const METRIC_DIRECTION: Record<MetricKey, MetricDirection> = {
  wake: 'lower',
  sleepHours: 'higher',
  sleepScore: 'higher',
  meditation: 'higher',
  gratitude: 'higher',
  exercise: 'higher',
  focus: 'higher',
  deepWork: 'higher',
  timetable: 'higher',
}

export interface MonthMetric {
  key: MetricKey
  label: string
  value: number | null
  display: string
  sampleSize: number
}

export interface MonthSummary {
  monthKey: string
  label: string
  daysLogged: number
  metrics: Record<MetricKey, MonthMetric>
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60) % 24
  const min = Math.round(m % 60)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function sleepScorePct(score?: number): number | null {
  if (score == null || Number.isNaN(score)) return null
  if (score <= 1) return score * 100
  return score
}

function monthEntries(entries: DailyEntry[], monthKey: string): DailyEntry[] {
  return entries
    .filter((e) => e.date.startsWith(monthKey) && entryHasData(enrichEntry(e)))
    .map(enrichEntry)
}

function buildMetric(
  key: MetricKey,
  label: string,
  value: number | null,
  display: string,
  sampleSize: number,
): MonthMetric {
  return { key, label, value, display, sampleSize }
}

export function summarizeMonth(monthKey: string, entries: DailyEntry[]): MonthSummary | null {
  const rows = monthEntries(entries, monthKey)
  if (rows.length === 0) return null

  const wakeMins = rows.map((e) => parseTimeToMinutes(e.wakeTime)).filter((v): v is number => v != null)
  const wakeAvg = avg(wakeMins)

  const sleepHrs = rows.map((e) => e.sleepHours).filter((v): v is number => v != null)
  const scoreRows = rows.filter((e) => e.date >= SLEEP_SCORE_TRACKED_FROM)
  const scores = scoreRows.map((e) => sleepScorePct(e.sleepScore)).filter((v): v is number => v != null)

  const meds = rows.map((e) => e.meditation).filter((v): v is number => v != null)
  const grRows = rows.filter((e) => e.gratitude != null)
  const exRows = rows.filter((e) => e.exercise != null)
  const focuses = rows.map((e) => e.avgFocus).filter((v): v is number => v != null)
  const dws = rows.map((e) => e.totalDeepWork).filter((v): v is number => v != null)
  const tts = rows.map((e) => e.timetable).filter((v): v is number => v != null)

  const grRate = grRows.length ? grRows.filter((e) => e.gratitude).length / grRows.length : null
  const exRate = exRows.length ? exRows.filter((e) => e.exercise).length / exRows.length : null

  const label = format(parseISO(`${monthKey}-01`), 'MMM yyyy', { locale: nl })

  return {
    monthKey,
    label,
    daysLogged: rows.length,
    metrics: {
      wake: buildMetric(
        'wake',
        'Wake',
        wakeAvg,
        wakeAvg != null ? formatMinutes(wakeAvg) : '—',
        wakeMins.length,
      ),
      sleepHours: buildMetric(
        'sleepHours',
        'Hrs',
        avg(sleepHrs),
        avg(sleepHrs) != null ? avg(sleepHrs)!.toFixed(1) : '—',
        sleepHrs.length,
      ),
      sleepScore: buildMetric(
        'sleepScore',
        'Sc%',
        avg(scores),
        avg(scores) != null ? `${Math.round(avg(scores)!)}` : '—',
        scores.length,
      ),
      meditation: buildMetric(
        'meditation',
        'Med',
        avg(meds),
        avg(meds) != null ? `${Math.round(avg(meds)!)}` : '—',
        meds.length,
      ),
      gratitude: buildMetric(
        'gratitude',
        'Gr',
        grRate,
        grRate != null ? `${Math.round(grRate * 100)}%` : '—',
        grRows.length,
      ),
      exercise: buildMetric(
        'exercise',
        'Ex',
        exRate,
        exRate != null ? `${Math.round(exRate * 100)}%` : '—',
        exRows.length,
      ),
      focus: buildMetric(
        'focus',
        'Foc',
        avg(focuses),
        avg(focuses) != null ? `${Math.round(avg(focuses)!)}` : '—',
        focuses.length,
      ),
      deepWork: buildMetric(
        'deepWork',
        'DW',
        avg(dws),
        avg(dws) != null ? avg(dws)!.toFixed(1) : '—',
        dws.length,
      ),
      timetable: buildMetric(
        'timetable',
        'TT',
        avg(tts),
        avg(tts) != null ? `${Math.round(avg(tts)!)}` : '—',
        tts.length,
      ),
    },
  }
}

export function buildMonthlySummaries(entries: DailyEntry[]): MonthSummary[] {
  const months = new Set<string>()
  for (const e of entries) {
    if (!entryHasData(e)) continue
    const d = parseISO(e.date)
    const m = startOfMonth(d)
    if (m < FIRST_MONTH) continue
    months.add(format(m, 'yyyy-MM'))
  }

  return [...months]
    .sort()
    .map((mk) => summarizeMonth(mk, entries))
    .filter((s): s is MonthSummary => s != null)
}

export function metricDelta(
  prev: MonthMetric | undefined,
  curr: MonthMetric,
): { text: string; improved: boolean | null } {
  if (prev?.value == null || curr.value == null) return { text: '', improved: null }

  const dir = METRIC_DIRECTION[curr.key]
  const diff = curr.value - prev.value

  if (Math.abs(diff) < 0.05) return { text: '·', improved: null }

  if (curr.key === 'wake') {
    const mins = Math.round(diff)
    const improved = mins < 0
    return { text: `${mins > 0 ? '+' : ''}${mins}m`, improved }
  }

  if (curr.key === 'gratitude' || curr.key === 'exercise') {
    const pts = Math.round(diff * 100)
    const improved = dir === 'higher' ? pts > 0 : pts < 0
    return { text: `${pts > 0 ? '+' : ''}${pts}%`, improved }
  }

  if (curr.key === 'sleepHours' || curr.key === 'deepWork') {
    const improved = dir === 'higher' ? diff > 0 : diff < 0
    return { text: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`, improved }
  }

  const rounded = Math.round(diff)
  const improved = dir === 'higher' ? rounded > 0 : rounded < 0
  return { text: `${rounded > 0 ? '+' : ''}${rounded}`, improved }
}

export const TREND_COLUMNS: { key: MetricKey; short: string }[] = [
  { key: 'wake', short: 'Wake' },
  { key: 'sleepHours', short: 'Hrs' },
  { key: 'sleepScore', short: 'Sc%' },
  { key: 'meditation', short: 'Med' },
  { key: 'gratitude', short: 'Gr' },
  { key: 'exercise', short: 'Ex' },
  { key: 'focus', short: 'Foc' },
  { key: 'deepWork', short: 'DW' },
  { key: 'timetable', short: 'TT' },
]
