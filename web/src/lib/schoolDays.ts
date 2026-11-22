import type { DailyEntry, DeepWorkSession } from '../types'

/** Soft orange — timetable fill only; distinct from rest blue */
export const SCHOOL_STRIPE_BG = '#D9894B'

export const MAX_SCHOOL_SESSIONS = 2

function schoolUid(): string {
  return `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function isSchoolDay(entry: Pick<DailyEntry, 'dayType'>): boolean {
  return entry.dayType === 'school'
}

export function schoolStripeTitle(
  entry: Pick<DailyEntry, 'schoolFocus' | 'schoolSessions'>,
): string {
  const focus =
    entry.schoolFocus != null ? ` · focus ${Math.round(entry.schoolFocus)}%` : ''
  const n = (entry.schoolSessions ?? []).filter(
    (s) => (s.startTime && s.endTime) || (s.durationHours != null && s.durationHours > 0),
  ).length
  return n > 0 ? `Schooldag (${n} lesblok${n === 1 ? '' : 'ken'})${focus}` : `Schooldag${focus}`
}

/** Active school lesson blocks (with times or duration). */
export function activeSchoolSessions(entry: Pick<DailyEntry, 'schoolSessions'>): DeepWorkSession[] {
  return (entry.schoolSessions ?? []).filter(
    (s) => (s.startTime && s.endTime) || (s.durationHours != null && s.durationHours > 0),
  )
}

/**
 * School day: lessons live in schoolSessions/schoolFocus, and deep work
 * (e.g. before school) stays in sessions like any other day.
 * Only the timetable score is dropped — the timetable cell is the school stripe.
 */
export function applySchoolDay(entry: DailyEntry): DailyEntry {
  const next: DailyEntry = {
    ...entry,
    dayType: 'school',
  }
  delete next.timetable
  delete next.dayOffKind
  delete next.dayOffLabel
  if (entry.schoolSessions?.length) {
    next.schoolSessions = entry.schoolSessions
  }
  if (entry.schoolFocus != null) {
    next.schoolFocus = entry.schoolFocus
  }
  return next
}

/** True when the entry has any deep work logged (sessions or legacy hours). */
export function hasDeepWork(
  entry: Pick<
    DailyEntry,
    'sessions' | 'totalDeepWork' | 'totalHoursNet' | 'deepWork1' | 'deepWork2' | 'deepWork3'
  >,
): boolean {
  const active = (entry.sessions ?? []).some(
    (s) => (s.startTime && s.endTime) || (s.durationHours != null && s.durationHours > 0),
  )
  return (
    active ||
    (entry.totalDeepWork ?? 0) > 0 ||
    (entry.totalHoursNet ?? 0) > 0 ||
    (entry.deepWork1 ?? 0) > 0 ||
    (entry.deepWork2 ?? 0) > 0 ||
    (entry.deepWork3 ?? 0) > 0
  )
}

/** Counts towards deep-work stats: any non-school day, or a school day with deep work. */
export function countsAsWorkDay(entry: DailyEntry): boolean {
  return !isSchoolDay(entry) || hasDeepWork(entry)
}

export function emptySchoolSession(): DeepWorkSession {
  return {
    id: schoolUid(),
    startTime: '',
    endTime: '',
    focusPercent: 0,
  }
}

export function ensureSchoolSessions(entry?: DailyEntry): DeepWorkSession[] {
  if (entry?.schoolSessions?.length) {
    return entry.schoolSessions.map((s) => ({ ...s }))
  }
  return [emptySchoolSession(), emptySchoolSession()]
}
