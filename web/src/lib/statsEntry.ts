import type { DailyEntry } from '../types'
import { getDisplayValue } from './colors'
import { enrichEntry } from './sessions'
import { activeSchoolSessions, isSchoolDay } from './schoolDays'

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined

/**
 * Entry as the stats see it. On a school day, lesson blocks count as work:
 * the deep-work fields hold deep work + lessons (same as the month grid),
 * so averages, floors and exports add both together.
 * Use only for numbers — never save or export the result as the entry.
 */
export function enrichForStats(raw: DailyEntry): DailyEntry {
  const e = enrichEntry(raw)
  if (!isSchoolDay(e) || activeSchoolSessions(e).length === 0) return e

  const next: DailyEntry = { ...e }
  for (let i = 1; i <= 6; i++) {
    const key = `deepWork${i}` as 'deepWork1'
    next[key] = num(getDisplayValue(e, key))
  }
  const net = num(getDisplayValue(e, 'totalHoursNet'))
  next.totalHoursNet = net
  next.totalDeepWork = net
  next.totalHoursWorked = num(getDisplayValue(e, 'totalHoursWorked'))
  next.avgFocus = num(getDisplayValue(e, 'avgFocus'))
  // Hours now live in the deepWork fields; drop the sources so nothing counts twice.
  delete next.sessions
  delete next.schoolSessions
  return next
}
