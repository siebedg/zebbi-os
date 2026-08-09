import type { DailyEntry, DeepWorkSession } from '../types'
import { SLEEP_SCORE_TRACKED_FROM, VACATION_DATES } from '../types'
import { applyRestDay, isKnownRestDate, isRestDay } from './restDays'
import { parseDistractionMinutes, uid } from './utils'

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

/** Wall-clock / declared duration before break subtraction. */
export function sessionGrossHours(session: DeepWorkSession): number {
  if (session.durationHours != null) return session.durationHours
  const start = parseTimeToMinutes(session.startTime)
  const end = parseTimeToMinutes(session.endTime)
  if (start == null || end == null) return 0
  let mins = end - start
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

export function sessionGrossMinutes(session: DeepWorkSession): number {
  return Math.round(sessionGrossHours(session) * 60)
}

/** Break minutes for a session (explicit field + legacy distraction text). */
export function sessionBreakMinutes(session: DeepWorkSession): number {
  const fromField = session.breakMinutes ?? 0
  const fromLegacy = parseDistractionMinutes(session.distraction)
  return Math.max(0, fromField + fromLegacy)
}

/** Actual worked hours = gross − breaks (clamped ≥ 0). */
export function sessionNetHours(session: DeepWorkSession): number {
  const gross = sessionGrossHours(session)
  if (gross <= 0) return 0
  const net = Math.max(0, gross - sessionBreakMinutes(session) / 60)
  return Math.round(net * 100) / 100
}

/** Net duration — used for DW columns, oscillation, and “worked” metrics. */
export function sessionDurationHours(session: DeepWorkSession): number {
  return sessionNetHours(session)
}

export function sessionDurationMinutes(session: DeepWorkSession): number {
  return Math.round(sessionNetHours(session) * 60)
}

export interface WorkTotals {
  totalHoursWorked: number
  totalHoursNet: number
  avgFocus: number | undefined
  distractionMinutes: number
}

export function computeWorkTotals(sessions: DeepWorkSession[]): WorkTotals {
  let grossMinutes = 0
  let netMinutes = 0
  let weightedFocus = 0
  let distractionMinutes = 0

  for (const s of sessions) {
    const gross = sessionGrossMinutes(s)
    if (gross <= 0) continue
    const breaks = sessionBreakMinutes(s)
    const net = Math.max(0, gross - breaks)
    grossMinutes += gross
    netMinutes += net
    distractionMinutes += breaks
    weightedFocus += (s.focusPercent || 0) * net
  }

  const totalHoursWorked = Math.round((grossMinutes / 60) * 100) / 100
  const totalHoursNet = Math.round((netMinutes / 60) * 100) / 100

  return {
    totalHoursWorked,
    totalHoursNet,
    avgFocus: netMinutes > 0 ? Math.round(weightedFocus / netMinutes) : undefined,
    distractionMinutes,
  }
}

export function enrichEntry(entry: DailyEntry): DailyEntry {
  let e = { ...entry }
  if (!e.dayType && VACATION_DATES.includes(e.date)) e.dayType = 'vacation'
  if (!e.dayType && isKnownRestDate(e.date)) e.dayType = 'rest'
  if (e.date < SLEEP_SCORE_TRACKED_FROM) delete e.sleepScore

  if (isRestDay(e)) return applyRestDay(e)

  const sessions = e.sessions ?? []
  if (sessions.length > 0) {
    const totals = computeWorkTotals(sessions)
    const active = sessions.filter(
      (s) => (s.startTime && s.endTime) || (s.durationHours != null && s.durationHours > 0),
    )
    const next = { ...e } as Record<string, unknown>
    for (let i = 1; i <= 6; i++) delete next[`deepWork${i}`]
    active.forEach((s, i) => {
      if (i >= 6) return
      const hours = sessionNetHours(s)
      if (hours > 0) next[`deepWork${i + 1}`] = hours
    })
    return {
      ...(next as unknown as DailyEntry),
      avgFocus: totals.avgFocus ?? e.avgFocus,
      totalHoursWorked: totals.totalHoursWorked,
      totalHoursNet: totals.totalHoursNet,
      totalDeepWork: totals.totalHoursNet,
    }
  }

  const legacy = [
    e.deepWork1, e.deepWork2, e.deepWork3, e.deepWork4, e.deepWork5, e.deepWork6,
  ].filter((v): v is number => v != null && v > 0)

  if (legacy.length > 0 || e.totalDeepWork != null) {
    const summed = Math.round(legacy.reduce((a, b) => a + b, 0) * 100) / 100
    const total = e.totalDeepWork ?? summed
    return {
      ...e,
      totalHoursWorked: e.totalHoursWorked ?? total,
      totalHoursNet: e.totalHoursNet ?? total,
      totalDeepWork: total,
    }
  }

  return e
}

export function emptySession(): DeepWorkSession {
  return { id: uid(), startTime: '', endTime: '', focusPercent: 75 }
}

export function formatSessionRange(s: DeepWorkSession): string {
  if (s.startTime && s.endTime) return `${s.startTime} → ${s.endTime}`
  if (s.durationHours) return `${s.durationHours}h`
  return '—'
}
