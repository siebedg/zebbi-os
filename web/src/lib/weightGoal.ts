import { differenceInCalendarDays, parseISO } from 'date-fns'

/** Easy to tweak — MacroFactor goal mirrored in Zebbi OS (visual only). */
export const WEIGHT_GOAL_KG = 75
/** Target date for 75 kg (next Feb after current bulk). */
export const WEIGHT_GOAL_DATE = '2027-02-10'

/** Within this many kg of the schedule line counts as on track. */
export const WEIGHT_SCHEDULE_TOLERANCE_KG = 0.15

/**
 * Linear schedule weight on `dateStr` from plan start → goal.
 * Same line the chart uses — so "should weigh X today" is unambiguous.
 */
export function projectedKgAt(
  dateStr: string,
  startDate: string,
  startKg: number,
  goalDate: string = WEIGHT_GOAL_DATE,
  goalKg: number = WEIGHT_GOAL_KG,
): number {
  const t0 = parseISO(startDate).getTime()
  const t1 = parseISO(goalDate).getTime()
  const t = parseISO(dateStr).getTime()
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || !Number.isFinite(t)) return startKg
  if (t1 <= t0) return goalKg
  if (t <= t0) return Math.round(startKg * 100) / 100
  if (t >= t1) return goalKg
  const p = (t - t0) / (t1 - t0)
  return Math.round((startKg + (goalKg - startKg) * p) * 100) / 100
}

export type ScheduleStatus = 'on' | 'ahead' | 'behind'

export type ScheduleCheck = {
  expectedKg: number
  /** actual − expected (positive = heavier than schedule) */
  deltaKg: number
  status: ScheduleStatus
  /** Days from plan start to goal */
  totalDays: number
  /** Days from plan start to check-in date */
  elapsedDays: number
}

/**
 * Compare an actual check-in to the linear plan.
 * Gain plan (goal ≥ start): above schedule = ahead.
 * Loss plan (goal < start): below schedule = ahead.
 */
export function checkWeightSchedule(
  actualKg: number,
  dateStr: string,
  startDate: string,
  startKg: number,
  goalDate: string = WEIGHT_GOAL_DATE,
  goalKg: number = WEIGHT_GOAL_KG,
  toleranceKg: number = WEIGHT_SCHEDULE_TOLERANCE_KG,
): ScheduleCheck {
  const expectedKg = projectedKgAt(dateStr, startDate, startKg, goalDate, goalKg)
  const deltaKg = Math.round((actualKg - expectedKg) * 10) / 10
  const gaining = goalKg >= startKg
  const totalDays = Math.max(1, differenceInCalendarDays(parseISO(goalDate), parseISO(startDate)))
  const elapsedDays = Math.max(
    0,
    Math.min(totalDays, differenceInCalendarDays(parseISO(dateStr), parseISO(startDate))),
  )

  if (Math.abs(deltaKg) <= toleranceKg) {
    return { expectedKg, deltaKg, status: 'on', totalDays, elapsedDays }
  }

  const ahead = gaining ? deltaKg > 0 : deltaKg < 0
  return {
    expectedKg,
    deltaKg,
    status: ahead ? 'ahead' : 'behind',
    totalDays,
    elapsedDays,
  }
}
