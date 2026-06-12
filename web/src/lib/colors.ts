import type { DailyEntry } from '../types'
import { SLEEP_SCORE_TRACKED_FROM, VACATION_DATES } from '../types'
import { enrichEntry } from './sessions'
import { isDarkTheme } from './theme'

export type ScoreLevel = 'excellent' | 'good' | 'ok' | 'poor' | 'empty' | 'bool-yes' | 'bool-no'

export interface CellStyle {
  level: ScoreLevel
  bg: string
  text: string
}

/** Excel Paris block: Wake → Med (#4A86E8) */
export const VACATION_BLUE_STYLE: CellStyle = {
  level: 'good',
  bg: '#4A86E8',
  text: '#ffffff',
}

/** Excel Paris block: Work → TT (#E06666) */
export const VACATION_RED_STYLE: CellStyle = {
  level: 'poor',
  bg: '#E06666',
  text: '#ffffff',
}

/** Excel Paris block: Gr → Foc% (white stripe) */
export const VACATION_WHITE_STYLE: CellStyle = {
  level: 'empty',
  bg: '#ffffff',
  text: '#333333',
}

/** @deprecated use VACATION_BLUE_STYLE */
export const VACATION_STYLE = VACATION_BLUE_STYLE

function timeNeutralStyle(): CellStyle {
  return isDarkTheme()
    ? { level: 'empty', bg: '#27272a', text: '#a1a1aa' }
    : { level: 'empty', bg: '#f4f4f5', text: '#52525b' }
}

function deepWorkStyle(): CellStyle {
  return isDarkTheme()
    ? { level: 'ok', bg: '#334155', text: '#cbd5e1' }
    : { level: 'ok', bg: '#e2e8f0', text: '#475569' }
}

export const DEEP_WORK_FIELDS = new Set([
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'deepWork4',
  'deepWork5',
  'totalDeepWork',
])

export const VACATION_BLUE_FIELDS = new Set([
  'wakeTime',
  'bedTime',
  'sleepHours',
  'sleepScore',
  'meditation',
])

export const VACATION_WHITE_FIELDS = new Set(['gratitude', 'exercise', 'avgFocus'])

export const VACATION_RED_FIELDS = new Set([
  'deepWork1',
  'deepWork2',
  'deepWork3',
  'deepWork4',
  'deepWork5',
  'totalDeepWork',
  'timetable',
])

export function getRestStyle(): CellStyle {
  return isDarkTheme()
    ? { level: 'ok', bg: '#27272a', text: '#a1a1aa' }
    : { level: 'ok', bg: '#f4f4f5', text: '#71717a' }
}

function scoreLevels(): Record<ScoreLevel, CellStyle> {
  if (isDarkTheme()) {
    return {
      excellent: { level: 'excellent', bg: '#14532d88', text: '#86efac' },
      good: { level: 'good', bg: '#1e3a8a88', text: '#93c5fd' },
      ok: { level: 'ok', bg: '#713f1288', text: '#fde047' },
      poor: { level: 'poor', bg: '#7f1d1d88', text: '#fca5a5' },
      empty: { level: 'empty', bg: '#27272a', text: '#71717a' },
      'bool-yes': { level: 'bool-yes', bg: '#14532d88', text: '#86efac' },
      'bool-no': { level: 'bool-no', bg: '#7f1d1d88', text: '#fca5a5' },
    }
  }
  return {
    excellent: { level: 'excellent', bg: '#dcfce7', text: '#15803d' },
    good: { level: 'good', bg: '#dbeafe', text: '#1d4ed8' },
    ok: { level: 'ok', bg: '#fef9c3', text: '#a16207' },
    poor: { level: 'poor', bg: '#fee2e2', text: '#b91c1c' },
    empty: { level: 'empty', bg: '#f4f4f5', text: '#a1a1aa' },
    'bool-yes': { level: 'bool-yes', bg: '#dcfce7', text: '#15803d' },
    'bool-no': { level: 'bool-no', bg: '#fee2e2', text: '#b91c1c' },
  }
}

export function isVacationDay(entry: DailyEntry): boolean {
  return entry.dayType === 'vacation' || VACATION_DATES.includes(entry.date)
}

export function getRowStyle(entry: DailyEntry): CellStyle | null {
  if (isVacationDay(entry)) return VACATION_BLUE_STYLE
  if (entry.dayType === 'rest' || entry.dayType === 'travel') return getRestStyle()
  return null
}

export function getDisplayValue(entry: DailyEntry, field: string): unknown {
  const e = enrichEntry(entry)
  if (field === 'sleepScore' && e.date < SLEEP_SCORE_TRACKED_FROM) return undefined
  if (field === 'totalDeepWork') return e.totalDeepWork ?? e.totalHoursWorked
  return e[field as keyof DailyEntry]
}

export function getVacationZone(field: string): 'blue' | 'white' | 'red' | null {
  if (VACATION_BLUE_FIELDS.has(field)) return 'blue'
  if (VACATION_WHITE_FIELDS.has(field)) return 'white'
  if (VACATION_RED_FIELDS.has(field)) return 'red'
  return null
}

export function getCellStyle(field: string, value: unknown, entry?: DailyEntry): CellStyle {
  const LEVELS = scoreLevels()

  if (field === 'wakeTime' || field === 'bedTime') {
    if (entry && isVacationDay(entry)) return VACATION_BLUE_STYLE
    return timeNeutralStyle()
  }
  if (DEEP_WORK_FIELDS.has(field)) {
    if (entry && isVacationDay(entry)) return VACATION_RED_STYLE
    return deepWorkStyle()
  }

  if (entry && isVacationDay(entry)) {
    const zone = getVacationZone(field)
    if (zone === 'blue') return VACATION_BLUE_STYLE
    if (zone === 'white') return VACATION_WHITE_STYLE
    if (zone === 'red') return VACATION_RED_STYLE
  }

  const rowStyle = entry ? getRowStyle(entry) : null
  if (rowStyle && (value == null || value === '')) return rowStyle

  if (value == null || value === '') return LEVELS.empty

  if (field === 'gratitude' || field === 'exercise') {
    return value ? LEVELS['bool-yes'] : LEVELS['bool-no']
  }

  if (field === 'meditation') {
    const n = Number(value)
    if (n >= 10) return LEVELS.excellent
    if (n >= 5) return LEVELS.good
    if (n > 0) return LEVELS.ok
    return LEVELS.poor
  }

  if (field === 'sleepHours') {
    const n = Number(value)
    if (n >= 7.5 && n <= 9) return LEVELS.excellent
    if (n >= 7 && n <= 9.5) return LEVELS.good
    if (n >= 6) return LEVELS.ok
    return LEVELS.poor
  }

  if (field === 'sleepScore') {
    const n = Number(value)
    const pct = n <= 1 ? n : n / 100
    if (pct >= 0.9) return LEVELS.excellent
    if (pct >= 0.8) return LEVELS.good
    if (pct >= 0.7) return LEVELS.ok
    return LEVELS.poor
  }

  if (field === 'avgFocus') {
    const n = Number(value)
    if (n >= 85) return LEVELS.excellent
    if (n >= 75) return LEVELS.good
    if (n >= 60) return LEVELS.ok
    return LEVELS.poor
  }

  if (field === 'timetable') {
    const n = Number(value)
    if (n >= 70) return LEVELS.excellent
    if (n >= 55) return LEVELS.good
    if (n >= 40) return LEVELS.ok
    return LEVELS.poor
  }

  return LEVELS.ok
}

export function formatFieldValue(field: string, value: unknown, entry?: DailyEntry): string {
  const onVacation = entry && isVacationDay(entry)
  const vacationZone = onVacation ? getVacationZone(field) : null

  if (value == null || value === '') {
    if (vacationZone) return ''
    return '·'
  }

  if (field === 'gratitude' || field === 'exercise') return value ? '✓' : '✗'
  if (field === 'sleepScore') {
    const n = Number(value)
    return `${Math.round((n <= 1 ? n : n / 100) * 100)}`
  }
  if (field === 'avgFocus' || field === 'timetable') return `${Math.round(Number(value))}`
  if (DEEP_WORK_FIELDS.has(field)) return `${Number(value).toFixed(2)}`
  if (field === 'meditation') return `${value}`
  if (field === 'sleepHours') return `${Number(value).toFixed(1)}`
  return String(value)
}

export function getEntryField(entry: DailyEntry, key: string): unknown {
  return getDisplayValue(entry, key)
}

export const MONTH_VIEW_COLUMNS = [
  { key: 'wakeTime', label: 'Wake' },
  { key: 'bedTime', label: 'Sleep' },
  { key: 'sleepHours', label: 'Hrs' },
  { key: 'sleepScore', label: 'Sc%' },
  { key: 'meditation', label: 'Med' },
  { key: 'gratitude', label: 'Gr' },
  { key: 'exercise', label: 'Ex' },
  { key: 'avgFocus', label: 'Foc%' },
  { key: 'deepWork1', label: 'DW1' },
  { key: 'deepWork2', label: 'DW2' },
  { key: 'deepWork3', label: 'DW3' },
  { key: 'deepWork4', label: 'DW4' },
  { key: 'deepWork5', label: 'DW5' },
  { key: 'totalDeepWork', label: 'Tot' },
  { key: 'timetable', label: 'TT' },
] as const
