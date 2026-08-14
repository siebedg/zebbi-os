import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import type { CommittedFloors, DailyEntry, FloorMetricId, OscillationProtocol, ReviewCycle } from '../types'
import {
  OSCILLATION_METRICS,
  buildRangeOscillationReport,
  collectMetricSeries,
  formatOscillationValue,
} from './oscillation'
import { todayISO, uid } from './utils'

export const REVIEW_METRICS: FloorMetricId[] = [
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'totalWorked',
  'avgFocus',
  'timetable',
]

const DEFAULT_FLOORS: CommittedFloors = {
  deepWork1: 90,
  deepWork2: 75,
  deepWork3: 45,
  totalWorked: 3.5,
  avgFocus: 65,
  timetable: 35,
}

const RAISE_STEP: CommittedFloors = {
  deepWork1: 5,
  deepWork2: 5,
  deepWork3: 5,
  totalWorked: 0.25,
  avgFocus: 5,
  timetable: 5,
}

export function defaultCycleStart(today = todayISO()): string {
  return format(subDays(parseISO(today), 29), 'yyyy-MM-dd')
}

export function cycleEnd(startDate: string, days: number): string {
  return format(addDays(parseISO(startDate), Math.max(1, days) - 1), 'yyyy-MM-dd')
}

export function defaultOscillationProtocol(today = todayISO()): OscillationProtocol {
  return {
    activity: 'Productivity — focused deep work, not shallow. Timetable + presence.',
    spectrumGood: '5h+ focused deep work, timetable followed, phone in drawer, short recharging breaks.',
    spectrumBad: 'Scrolling, junk food, high-dopamine access, breaks that become full distraction.',
    plusAmplitude:
      'Above 4h focused deep work at ~80% focus. Timetable ~60%. Surpassing that crashes back.',
    minusAmplitude: 'Never below 2h focused deep work, 60% focus, 25% timetable — old floor.',
    periodDays: 14,
    output: '6h focused deep work · 85% focus · 85% timetable.',
    inputsGood: 'Bed on time + perfect morning routine.',
    inputsBad: 'Sleep deprived, no schedule, no morning routine.',
    stockGood: 'Rested, full of energy, ready.',
    stockBad: 'Unenergetic, not wanting to do the work.',
    feedback: 'Zebbi OS & timetable.',
    feedbackDelay: 'The delay is reviewing, not tracking. Feedback arrives hours-to-days late.',
    delayFix: 'Fixed checkpoints (after lunch, before dinner) + 60s end-of-day yes/no.',
    negativeTrigger: 'Slacking on sleep and being unconscious. Evening routine late. Low meditation / presence.',
    negativeLoop: 'Not present → not aware you are not present. Sleep slip → wake later → bed later. 2 → 4 → 8.',
    antiTrigger:
      'Evening routine on time. If presence drops, that is the drop. Do not skip sleep to “make up” work.',
    positiveTrigger:
      'Near-zero work with a huge todo list. Guilt, 2 coffees, 6h sleep, opening Insta. Enough — lock in.',
    positiveLoop: 'Follow oscillations. Night routine over distraction → sleep → charged next day.',
    hardLimits: 'Productivity has a body limit. Don’t pour hours past recovery.',
    committed: { ...DEFAULT_FLOORS },
    cycleDays: 30,
    cycleStart: defaultCycleStart(today),
    history: [],
  }
}

export function normalizeOscillationProtocol(
  value?: Partial<OscillationProtocol> | null,
): OscillationProtocol {
  const base = defaultOscillationProtocol()
  if (!value) return base
  return {
    ...base,
    ...value,
    committed: { ...base.committed, ...(value.committed ?? {}) },
    cycleDays: typeof value.cycleDays === 'number' ? Math.max(30, Math.min(90, value.cycleDays)) : 30,
    cycleStart: value.cycleStart || base.cycleStart,
    history: Array.isArray(value.history) ? value.history : [],
    periodDays: typeof value.periodDays === 'number' ? value.periodDays : 14,
  }
}

export function cycleProgress(protocol: OscillationProtocol, today = todayISO()) {
  const days = protocol.cycleDays
  const start = protocol.cycleStart
  const end = cycleEnd(start, days)
  const elapsed = Math.max(1, differenceInCalendarDays(parseISO(today), parseISO(start)) + 1)
  const complete = today >= end
  return {
    start,
    end,
    days,
    elapsed: Math.min(elapsed, days),
    remaining: Math.max(0, days - elapsed),
    complete,
  }
}

export type FloorRow = {
  id: FloorMetricId
  label: string
  committed: number
  committedLabel: string
  actual: number | null
  actualLabel: string
  samples: number
  daysBelow: number
  held: boolean
  proposed: number
  proposedLabel: string
}

export function floorRows(entries: DailyEntry[], protocol: OscillationProtocol): FloorRow[] {
  const { start, end } = cycleProgress(protocol)
  const report = buildRangeOscillationReport(entries, start, end)
  const inRange = entries.filter((e) => e.date >= start && e.date <= end)

  return REVIEW_METRICS.map((id) => {
    const metric = OSCILLATION_METRICS.find((m) => m.id === id)
    const committed = protocol.committed[id]
    const band = report.bands.find((b) => b.metric.id === id)
    const actual = band?.low ?? null
    const series = collectMetricSeries(inRange, id)
    const daysBelow = series.filter((p) => p.value < committed).length
    const held = series.length > 0 && daysBelow === 0
    const step = RAISE_STEP[id]
    let proposed = committed
    if (actual != null && actual > committed) proposed = actual
    else if (held) proposed = committed + step
    const unit = metric?.unit ?? 'uur'
    return {
      id,
      label: metric?.label ?? id,
      committed,
      committedLabel: formatOscillationValue(committed, unit),
      actual,
      actualLabel: actual == null ? '—' : formatOscillationValue(actual, unit),
      samples: series.length,
      daysBelow,
      held,
      proposed,
      proposedLabel: formatOscillationValue(proposed, unit),
    }
  })
}

export function closeCycle(
  protocol: OscillationProtocol,
  raisedTo: CommittedFloors,
  today = todayISO(),
): OscillationProtocol {
  const { start, end, days } = cycleProgress(protocol, today)
  const cycle: ReviewCycle = {
    id: uid(),
    startDate: start,
    endDate: end,
    days,
    committed: { ...protocol.committed },
    raisedTo: { ...raisedTo },
    closedAt: new Date().toISOString(),
  }
  return {
    ...protocol,
    committed: { ...raisedTo },
    cycleStart: today,
    history: [cycle, ...protocol.history].slice(0, 24),
    updatedAt: new Date().toISOString(),
  }
}
