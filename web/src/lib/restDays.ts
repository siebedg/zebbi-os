import type { DailyEntry, DayOffKind } from '../types'
import { REST_DATES } from '../types'

/** Foc%, DW1–DW5, Tot, TT — één doorlopende rust-streep in maandweergave */
export const REST_WORK_FIELDS = [
  'avgFocus',
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'deepWork4',
  'deepWork5',
  'totalDeepWork',
  'timetable',
] as const

export const REST_WORK_FIELD_SET = new Set<string>(REST_WORK_FIELDS)

/** Intended rest day */
export const REST_STRIPE_BG = '#4A86E8'
/** Day off that wasn't the plan — same blue, paler tint */
export const REST_OTHER_STRIPE_BG = '#8AB0E8'

export function isKnownRestDate(date: string): boolean {
  return (REST_DATES as readonly string[]).includes(date)
}

export function isRestDay(entry: Pick<DailyEntry, 'date' | 'dayType'>): boolean {
  return entry.dayType === 'rest' || isKnownRestDate(entry.date)
}

export function getDayOffKind(
  entry: Pick<DailyEntry, 'date' | 'dayType' | 'dayOffKind'>,
): DayOffKind {
  if (entry.dayOffKind === 'other') return 'other'
  return 'planned'
}

export function restStripeBg(
  entry: Pick<DailyEntry, 'date' | 'dayType' | 'dayOffKind'>,
): string {
  return getDayOffKind(entry) === 'other' ? REST_OTHER_STRIPE_BG : REST_STRIPE_BG
}

export function restStripeTitle(
  entry: Pick<DailyEntry, 'date' | 'dayType' | 'dayOffKind' | 'dayOffLabel'>,
): string {
  if (getDayOffKind(entry) === 'other') {
    const label = entry.dayOffLabel?.trim()
    return label ? `Day off — ${label}` : 'Day off (niet gepland)'
  }
  return 'Rustdag'
}

export function clearWorkFields(entry: DailyEntry): DailyEntry {
  const e = { ...entry }
  delete e.sessions
  delete e.avgFocus
  delete e.totalHoursWorked
  delete e.totalHoursNet
  delete e.timetable
  delete e.deepWork1
  delete e.deepWork2
  delete e.deepWork3
  delete e.deepWork4
  delete e.deepWork5
  delete e.deepWork6
  delete e.totalDeepWork
  return e
}

export function applyRestDay(entry: DailyEntry): DailyEntry {
  if (!isRestDay(entry)) return entry
  const kind = getDayOffKind(entry)
  const next: DailyEntry = {
    ...entry,
    dayType: 'rest',
    dayOffKind: kind,
  }
  if (kind === 'other' && entry.dayOffLabel?.trim()) {
    next.dayOffLabel = entry.dayOffLabel.trim()
  } else {
    delete next.dayOffLabel
    if (kind === 'planned') next.dayOffKind = 'planned'
  }
  return clearWorkFields(next)
}
