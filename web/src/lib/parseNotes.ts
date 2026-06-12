import type { DailyEntry, DayType, DeepWorkSession } from '../types'
import { VACATION_DATES } from '../types'
import { applyRestDay } from './restDays'
import { enrichEntry } from './sessions'
import { emptySession, sessionDurationHours } from './sessions'
import { uid } from './utils'

export interface ParsedDay {
  date?: string
  sessions: DeepWorkSession[]
  wakeTime?: string
  bedTime?: string
  sleepHours?: number
  sleepAsleepHours?: number
  sleepScore?: number
  meditation?: number
  gratitude?: boolean
  exercise?: boolean
  diet?: string
  dayType?: DayType
  totalHoursWorked?: number
  timetable?: number
  notes?: string
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
}

export function normalizeTime(t: string): string {
  const clean = t.trim().toLowerCase().replace(/\s/g, '')
  const m = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/)
  if (!m) return t
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ap = m[3]
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function parseDurationHours(text: string): number | undefined {
  const plus = text.match(/\+?-\s*(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:utes?)?)?)?/i)
  const hms = text.match(/(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:utes?)?)?)?/i)
  const src = plus ?? hms
  if (src) {
    const h = parseInt(src[1], 10)
    const m = src[2] ? parseInt(src[2], 10) : 0
    return Math.round((h + m / 60) * 100) / 100
  }
  const u = text.match(/(\d+)u(?:\s*(\d+)\s*m)?/i)
  if (u) {
    const h = parseInt(u[1], 10)
    const m = u[2] ? parseInt(u[2], 10) : 0
    return Math.round((h + m / 60) * 100) / 100
  }
  const dec = text.match(/(\d+[.,]\d+)\s*(?:hours?|u)?/i)
  if (dec) return parseFloat(dec[1].replace(',', '.'))
  return undefined
}

function parseDateFromHeader(line: string, ctxYear?: number): string | undefined {
  const body = line.replace(/^date:\s*/i, '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(body)) return body.slice(0, 10)
  if (/\d+\s*[-–]\s*\d+/.test(body) && /feb|paris/i.test(body)) return undefined

  const months = Object.keys(MONTHS).join('|')
  const patterns = [
    new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})`, 'i'),
    new RegExp(`(${months})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i'),
    new RegExp(`^(${months})\\s+(\\d{1,2})$`, 'i'),
    new RegExp(`^(${months})\\s+(\\d{1,2})\\s+(\\d{4})`, 'i'),
  ]

  let day: number | undefined
  let month: number | undefined
  let year = ctxYear

  for (const re of patterns) {
    const m = body.match(re)
    if (!m) continue
    if (m[3] && /^\d{4}$/.test(m[3])) {
      year = parseInt(m[3], 10)
      month = MONTHS[m[1].toLowerCase()]
      day = parseInt(m[2], 10)
    } else if (MONTHS[m[1]?.toLowerCase()]) {
      month = MONTHS[m[1].toLowerCase()]
      day = parseInt(m[2], 10)
    } else {
      day = parseInt(m[1], 10)
      month = MONTHS[m[2].toLowerCase()]
    }
    break
  }

  if (!day || !month) return undefined
  if (!year) year = month >= 11 ? 2025 : 2026
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseGratitude(line: string): boolean | undefined {
  const v = line.replace(/^gratitude:\s*/i, '').trim()
  if (!v || v === '/' || /^no$/i.test(v)) return false
  if (/^yes$/i.test(v)) return true
  if (v.length > 3) return true
  return undefined
}

function parseExercise(line: string): boolean | undefined {
  const v = line.replace(/^exercise:\s*/i, '').trim()
  if (!v || v === '/' || /^no$/i.test(v) || /^none$/i.test(v)) return false
  if (/^yes$/i.test(v)) return true
  if (v.length > 2) return true
  return undefined
}

function parseSleepHoursLine(line: string): Pick<ParsedDay, 'sleepHours' | 'sleepAsleepHours' | 'sleepScore'> {
  const out: Pick<ParsedDay, 'sleepHours' | 'sleepAsleepHours' | 'sleepScore'> = {}
  const inBed = line.match(/([\d:.]+)\s*h?\s*in\s*bed/i)
  const asleep = line.match(/([\d:.]+)\s*h?\s*asleep/i)
  const score = line.match(/(\d{1,3})\s*%\s*sleepscore/i)

  if (inBed) out.sleepHours = parseDurationHours(inBed[1] + 'h') ?? parseFloat(inBed[1])
  if (asleep) out.sleepAsleepHours = parseDurationHours(asleep[1] + 'h') ?? parseFloat(asleep[1])
  if (score) out.sleepScore = parseInt(score[1], 10) / 100
  return out
}

function parseTimeRange(line: string): { start: string; end: string; rest: string } | null {
  const m = line.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:→|-->)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (!m) return null
  return {
    start: normalizeTime(m[1].replace(/\s/g, '')),
    end: normalizeTime(m[2].replace(/\s/g, '')),
    rest: line.slice(m.index! + m[0].length).trim(),
  }
}

function parseFocusPercent(line: string): number | undefined {
  const m = line.match(/focus:\s*(\d{1,3})/i)
  if (m) return parseInt(m[1], 10)
  const bare = line.match(/^(\d{1,3})\s*%/)
  if (bare) return parseInt(bare[1], 10)
  return undefined
}

/** Elk tekstblok (gescheiden door lege regels) = één DW-sessie: tijdregel + focus % */
export function parseWorkBlocks(text: string): DeepWorkSession[] {
  const sessions: DeepWorkSession[] = []
  for (const block of text.trim().split(/\n\s*\n+/)) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^distraction/i.test(l))
    const rangeLine = lines.find((l) => /(?:→|-->)/.test(l))
    if (!rangeLine) continue
    const range = parseTimeRange(rangeLine)
    if (!range) continue
    const session = emptySession()
    session.startTime = range.start
    session.endTime = range.end
    const pctLine = lines.find((l) => /^\d{1,3}\s*%/.test(l) || /^focus:/i.test(l))
    const focus = pctLine ? parseFocusPercent(pctLine) : undefined
    if (focus != null) session.focusPercent = focus
    sessions.push(session)
  }
  return sessions
}

function parseSingleDayBlock(text: string, ctxYear?: number): ParsedDay {
  const result: ParsedDay = { sessions: [] }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let pendingSession: DeepWorkSession | null = null

  for (const line of lines) {
    if (/^distraction/i.test(line)) continue
    if (/^date:/i.test(line)) {
      result.date = parseDateFromHeader(line, ctxYear)
      continue
    }
    if (/^PARIS$/i.test(line) || (/paris/i.test(line) && line.length < 30)) {
      result.dayType = 'vacation'
      result.notes = (result.notes ? result.notes + ' ' : '') + line
      continue
    }
    if (
      /^(REST\s*DAY|RUST\s*DAG|RUSTDAG)$/i.test(line) ||
      /^RIJBEWIJS$/i.test(line)
    ) {
      result.dayType = 'rest'
      continue
    }
    if (/^wake\s*time/i.test(line)) {
      const t = line.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
      if (t) result.wakeTime = normalizeTime(t[1].replace(/\s/g, ''))
      continue
    }
    if (/^sleep\s*time/i.test(line) && !/sleep\s*hours/i.test(line)) {
      const t = line.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
      if (t) result.bedTime = normalizeTime(t[1].replace(/\s/g, ''))
      continue
    }
    if (/^sleep\s*hours/i.test(line)) {
      Object.assign(result, parseSleepHoursLine(line))
      continue
    }
    if (/^meditation/i.test(line)) {
      const n = line.match(/([\d.]+)\s*min/i)
      if (n) result.meditation = parseFloat(n[1])
      continue
    }
    if (/^gratitude/i.test(line)) {
      result.gratitude = parseGratitude(line)
      continue
    }
    if (/^diet:/i.test(line)) {
      result.diet = line.replace(/^diet:\s*/i, '')
      continue
    }
    if (/^exercise/i.test(line)) {
      result.exercise = parseExercise(line)
      continue
    }
    if (/^timetable/i.test(line)) {
      const n = line.match(/([\d.]+)/)
      if (n) result.timetable = parseFloat(n[1])
      continue
    }
    if (/^total\s*hours\s*worked/i.test(line)) {
      const dur = parseDurationHours(line)
      if (dur != null) result.totalHoursWorked = dur
      continue
    }

    const dwMatch = line.match(/^(?:deep\s*work|dw)\s*(\d+)\s*:\s*(.+)$/i)
    if (dwMatch) {
      if (pendingSession) result.sessions.push(pendingSession)
      pendingSession = emptySession()
      const body = dwMatch[2]
      const range = parseTimeRange(body)
      if (range) {
        pendingSession.startTime = range.start
        pendingSession.endTime = range.end
        pendingSession.description = range.rest.replace(/^of\s+/i, '') || undefined
      } else {
        const dur = parseDurationHours(body)
        if (dur != null) pendingSession.durationHours = dur
        pendingSession.description = body
      }
      continue
    }

    if (/^work\s*\d+\s*:/i.test(line)) {
      if (pendingSession) result.sessions.push(pendingSession)
      pendingSession = emptySession()
      const range = parseTimeRange(line)
      if (range) {
        pendingSession.startTime = range.start
        pendingSession.endTime = range.end
      }
      continue
    }

    const bareRange = parseTimeRange(line)
    if (bareRange && !/^deep/i.test(line) && !/^total/i.test(line) && !/^date/i.test(line)) {
      if (pendingSession) result.sessions.push(pendingSession)
      pendingSession = emptySession()
      pendingSession.startTime = bareRange.start
      pendingSession.endTime = bareRange.end
      pendingSession.description = bareRange.rest || undefined
      continue
    }

    const focus = parseFocusPercent(line)
    if (focus != null && pendingSession) {
      pendingSession.focusPercent = focus
      result.sessions.push(pendingSession)
      pendingSession = null
      continue
    }

    const simpleRange = line.match(/^(\d{1,2}:\d{2})\s*-->\s*(\d{1,2}:\d{2})/)
    if (simpleRange) {
      if (pendingSession) result.sessions.push(pendingSession)
      pendingSession = emptySession()
      pendingSession.startTime = normalizeTime(simpleRange[1])
      pendingSession.endTime = normalizeTime(simpleRange[2])
      continue
    }
  }

  if (pendingSession) result.sessions.push(pendingSession)
  if (result.date && VACATION_DATES.includes(result.date)) result.dayType = 'vacation'
  return result
}

export function splitDayBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  return normalized.split(/\n(?=Date:\s)/i).map((p) => p.trim()).filter(Boolean)
}

function expandDateRangeHeader(line: string, ctxYear?: number): string[] | undefined {
  const body = line.replace(/^date:\s*/i, '').trim()
  const months = Object.keys(MONTHS).join('|')
  const range = body.match(
    new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${months})(?:\\s+(\\d{4}))?`, 'i'),
  )
  if (!range) return undefined
  const start = parseInt(range[1], 10)
  const end = parseInt(range[2], 10)
  const month = MONTHS[range[3].toLowerCase()]
  const year = range[4] ? parseInt(range[4], 10) : ctxYear ?? (month >= 11 ? 2025 : 2026)
  const dates: string[] = []
  for (let d = start; d <= end; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

export function parseMultiDayNotes(text: string): ParsedDay[] {
  const blocks = splitDayBlocks(text)
  const results: ParsedDay[] = []
  let yearHint: number | undefined

  for (const block of blocks) {
    const firstLine = block.split(/\r?\n/).find((l) => l.trim())?.trim() ?? ''
    const rangeDates = /^date:/i.test(firstLine) ? expandDateRangeHeader(firstLine, yearHint) : undefined

    if (rangeDates?.length) {
      const template = parseSingleDayBlock(block.replace(/^date:[^\n]+\n?/i, ''), yearHint)
      for (const d of rangeDates) {
        results.push({
          ...template,
          date: d,
          dayType: /paris/i.test(block) || VACATION_DATES.includes(d) ? 'vacation' : template.dayType,
        })
        yearHint = parseInt(d.slice(0, 4), 10)
      }
      continue
    }

    const day = parseSingleDayBlock(block, yearHint)
    if (day.date) yearHint = parseInt(day.date.slice(0, 4), 10)
    if (day.date || day.sessions.length || day.wakeTime || day.totalHoursWorked != null) {
      results.push(day)
    }
  }
  return results
}

export function parsedDayToEntry(day: ParsedDay, fallbackDate: string): DailyEntry {
  const sessions = day.sessions.map((s) => ({ ...s, id: s.id || uid() }))
  const computed = sessions.reduce((sum, s) => sum + sessionDurationHours(s), 0)

  const base: DailyEntry = {
    date: day.date ?? fallbackDate,
    wakeTime: day.wakeTime,
    bedTime: day.bedTime,
    sleepHours: day.sleepAsleepHours ?? day.sleepHours,
    sleepAsleepHours: day.sleepAsleepHours,
    sleepScore: day.sleepScore,
    meditation: day.meditation,
    gratitude: day.gratitude,
    exercise: day.exercise,
    diet: day.diet,
    dayType: day.dayType,
    notes: day.notes,
  }

  if (day.dayType === 'rest') return enrichEntry(applyRestDay(base))

  return enrichEntry({
    ...base,
    sessions,
    totalHoursWorked: day.totalHoursWorked ?? (computed > 0 ? Math.round(computed * 100) / 100 : undefined),
    timetable: day.timetable,
  })
}

export function parseNotesText(text: string): ParsedDay {
  const multi = parseMultiDayNotes(text)
  if (multi.length >= 1) return multi[0]
  return parseSingleDayBlock(text)
}

export function sessionsToNotesText(sessions: DeepWorkSession[]): string {
  return sessions
    .filter((s) => (s.startTime && s.endTime) || s.durationHours)
    .map((s) => {
      if (s.startTime && s.endTime) {
        return `${s.startTime} --> ${s.endTime}\n${s.focusPercent}%`
      }
      return `Deep work: ${s.durationHours}h\n${s.focusPercent}%`
    })
    .join('\n\n\n')
}
