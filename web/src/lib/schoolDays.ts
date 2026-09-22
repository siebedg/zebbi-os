import type { DailyEntry, DeepWorkSession } from '../types'
import { clearWorkFields } from './restDays'

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

/** Strip deep-work fields; keep schoolSessions + schoolFocus. */
export function applySchoolDay(entry: DailyEntry): DailyEntry {
  const cleared = clearWorkFields({ ...entry })
  const next: DailyEntry = {
    ...cleared,
    dayType: 'school',
  }
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
