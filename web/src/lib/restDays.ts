import type { DailyEntry } from '../types'
import { REST_DATES } from '../types'

/** DW1–DW5, Tot, TT — één doorlopende rust-streep in maandweergave */
export const REST_WORK_FIELDS = [
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'deepWork4',
  'deepWork5',
  'totalDeepWork',
  'timetable',
] as const

export const REST_WORK_FIELD_SET = new Set<string>(REST_WORK_FIELDS)

export const REST_STRIPE_BG = '#4A86E8'

export function isKnownRestDate(date: string): boolean {
  return (REST_DATES as readonly string[]).includes(date)
}

export function isRestDay(entry: Pick<DailyEntry, 'date' | 'dayType'>): boolean {
  return entry.dayType === 'rest' || isKnownRestDate(entry.date)
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
  return clearWorkFields({ ...entry, dayType: 'rest' })
}
