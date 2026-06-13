import { format, parseISO, subDays, differenceInMinutes, isValid } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { DailyEntry } from '../types'
import { SLEEP_SCORE_TRACKED_FROM, VACATION_DATES } from '../types'
import { enrichEntry } from './sessions'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Kalenderdag vóór `date` (YYYY-MM-DD). */
export function prevDateISO(dateStr: string): string {
  return format(subDays(parseISO(dateStr), 1), 'yyyy-MM-dd')
}

/** Whoop-stijl: bedtijd in formulier = avond van vorige kalenderdag */
export function bedTimeForForm(
  bedTargetDate: string,
  getByDate: (date: string) => DailyEntry | undefined,
): string | undefined {
  return getByDate(bedTargetDate)?.bedTime
}

/**
 * Wake/score/werk op wake-dag. Bed op `bedTargetDate` (= vorige kalenderdag, maand Sleep-kolom).
 */
export function prepareWhoopSleepSave(
  entry: DailyEntry,
  bedTargetDate: string,
  getByDate: (date: string) => DailyEntry | undefined,
): { upserts: DailyEntry[]; deleteDates: string[] } {
  const { bedTime, ...rest } = entry
  const bedEntry = getByDate(bedTargetDate)
  const bedBeforeWake = getByDate(prevDateISO(entry.date))?.bedTime
  const bedForHours =
    bedTargetDate === prevDateISO(entry.date) ? bedTime || bedBeforeWake : bedBeforeWake

  const today: DailyEntry = {
    ...rest,
    sleepHours: computeSleepHours(rest.wakeTime, bedForHours || undefined),
  }

  const upserts: DailyEntry[] = []
  const deleteDates: string[] = []

  if (entryHasData(today)) upserts.push(today)

  if (bedTime) {
    upserts.push({ ...(bedEntry ?? { date: bedTargetDate }), date: bedTargetDate, bedTime })
  } else if (bedEntry?.bedTime) {
    const { bedTime: _removed, ...prevRest } = bedEntry
    if (entryHasData(prevRest as DailyEntry)) {
      upserts.push({ ...(prevRest as DailyEntry), date: bedTargetDate })
    } else {
      deleteDates.push(bedTargetDate)
    }
  }

  return { upserts, deleteDates }
}

export function dateToLocalISO(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function isValidDateStr(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false
  return isValid(parseISO(dateStr))
}

export function formatDateNL(dateStr: string, pattern = 'd MMM yyyy'): string {
  try {
    if (!isValidDateStr(dateStr)) return dateStr
    return format(parseISO(dateStr), pattern, { locale: nl })
  } catch {
    return dateStr
  }
}

export function formatChartLabel(dateStr: string): string {
  if (!isValidDateStr(dateStr)) return '?'
  return format(parseISO(dateStr), 'd/M', { locale: nl })
}

export function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

/** 07:30 → 7:30 AM, 22:46 → 10:46 PM */
export function formatTime12(time?: string): string {
  if (!time) return ''
  const mins = parseTimeToMinutes(time)
  if (mins == null) return time
  const h24 = Math.floor(mins / 60) % 24
  const min = mins % 60
  const ap = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return `${h12}:${String(min).padStart(2, '0')} ${ap}`
}

/** 10:46 PM → 22:46 */
export function parseTime12To24(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed
  const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (!m) return undefined
  let h = parseInt(m[1], 10)
  const min = m[2] ?? '00'
  const ap = m[3].toUpperCase()
  if (ap === 'AM' && h === 12) h = 0
  if (ap === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${min}`
}

export function parseDistractionMinutes(text?: string): number {
  if (!text || /^none$/i.test(text.trim())) return 0
  const m = text.match(/(\d+)\s*min/i)
  return m ? parseInt(m[1], 10) : 0
}

/** Early Excel rows stored meditation minutes in the sleepscore column (2–25). */
export function normalizeSleepScore(
  score?: number,
  meditation?: number,
): number | undefined {
  if (score == null || Number.isNaN(score)) return undefined
  if (score <= 1) return score
  if (score <= 100) {
    if (Number.isInteger(score) && score <= 25) {
      if (meditation != null && Math.abs(score - meditation) < 1.5) return undefined
      if (score <= 20) return undefined
    }
    return score / 100
  }
  return undefined
}

/** Slaapuren: bedtijd (avond) → wake (ochtend), bv. 23:20 → 06:59 = 7,65u */
export function computeSleepHours(wake?: string, bed?: string): number | undefined {
  const wakeM = parseTimeToMinutes(wake)
  const bedM = parseTimeToMinutes(bed)
  if (wakeM == null || bedM == null) return undefined
  let diff = wakeM - bedM
  if (diff <= 0) diff += 24 * 60
  return Math.round((diff / 60) * 100) / 100
}

export function entryHasData(entry: DailyEntry): boolean {
  const legacyDw = [entry.deepWork1, entry.deepWork2, entry.deepWork3, entry.deepWork4, entry.deepWork5, entry.deepWork6]
  return Boolean(
    entry.wakeTime ||
      entry.bedTime ||
      entry.sleepHours != null ||
      entry.sleepScore != null ||
      entry.meditation != null ||
      entry.gratitude != null ||
      entry.exercise != null ||
      entry.avgFocus != null ||
      entry.totalHoursWorked != null ||
      entry.totalDeepWork != null ||
      legacyDw.some((v) => v != null && v > 0) ||
      (entry.sessions && entry.sessions.some((s) => s.startTime && s.endTime)) ||
      entry.timetable != null ||
      entry.notes ||
      entry.dayType === 'rest' ||
      entry.dayType === 'vacation',
  )
}

export function normalizeImportedRow(raw: Record<string, unknown>): DailyEntry | null {
  const dateRaw = raw.Date ?? raw.date
  if (!dateRaw) return null
  const date =
    dateRaw instanceof Date
      ? `${dateRaw.getUTCFullYear()}-${String(dateRaw.getUTCMonth() + 1).padStart(2, '0')}-${String(dateRaw.getUTCDate()).padStart(2, '0')}`
      : typeof dateRaw === 'string'
        ? dateRaw.slice(0, 10)
        : null
  if (!date) return null

  const parseBool = (v: unknown): boolean | undefined => {
    if (v === 1 || v === '1' || v === true) return true
    if (v === 0 || v === '0' || v === false) return false
    return undefined
  }

  const parseNum = (v: unknown): number | undefined => {
    if (v == null || v === '' || v === 'undefined') return undefined
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
    return isNaN(n) ? undefined : n
  }

  const parseTime = (v: unknown): string | undefined => {
    if (!v || v === 'undefined') return undefined
    if (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v)) return v
    if (v instanceof Date) {
      return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
    }
    return undefined
  }

  const entry: DailyEntry = {
    date,
    wakeTime: parseTime(raw['Wake time'] ?? raw['Wake time '] ?? raw.wakeTime),
    bedTime: parseTime(raw['Bed time'] ?? raw.bedTime),
    sleepHours: parseNum(raw['Sleep hours'] ?? raw.sleepHours),
    meditation: parseNum(raw.Meditation ?? raw.meditation),
    gratitude: parseBool(raw.Gratitude ?? raw.gratitude),
    exercise: parseBool(raw.Exercise ?? raw.exercise),
    avgFocus: parseNum(raw['Avg Focus %'] ?? raw.avgFocus),
    deepWork1: parseNum(raw['Deep work 1'] ?? raw.deepWork1),
    deepWork2: parseNum(raw['Deep work 2'] ?? raw.deepWork2),
    deepWork3: parseNum(raw['Deep work 3'] ?? raw.deepWork3),
    deepWork4: parseNum(raw['Deep work 4'] ?? raw.deepWork4),
    deepWork5: parseNum(raw['Deep work 5'] ?? raw.deepWork5),
    deepWork6: parseNum(raw['Deep work 6'] ?? raw.deepWork6),
    totalDeepWork: parseNum(raw['Total Deep Work (h)'] ?? raw.totalDeepWork),
    timetable: parseNum(raw.Timetable ?? raw.timetable),
  }

  const rawScore = normalizeSleepScore(
    parseNum(raw.Sleepscore ?? raw.sleepScore),
    entry.meditation,
  )
  if (date >= SLEEP_SCORE_TRACKED_FROM) entry.sleepScore = rawScore

  if (VACATION_DATES.includes(date)) entry.dayType = 'vacation'

  if (entry.sleepHours == null && entry.wakeTime && entry.bedTime)
    entry.sleepHours = computeSleepHours(entry.wakeTime, entry.bedTime)

  return entry
}

/** Replace month rows with authoritative bundled data */
export function patchMonthData(
  dailyLog: DailyEntry[],
  monthEntries: DailyEntry[],
  extraDropDates: string[] = [],
): DailyEntry[] {
  const dates = new Set(monthEntries.map((e) => e.date))
  const drop = new Set(extraDropDates)
  const rest = dailyLog.filter((e) => !dates.has(e.date) && !drop.has(e.date))
  return [...rest, ...monthEntries.map(enrichEntry)].sort((a, b) => a.date.localeCompare(b.date))
}

/** @deprecated use patchMonthData */
export function patchDecember2025(dailyLog: DailyEntry[], december: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, december, ['2025-11-30'])
}

export function patchJanuary2026(dailyLog: DailyEntry[], january: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, january)
}

export function patchFebruary2026(dailyLog: DailyEntry[], february: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, february)
}

export function patchMarch2026(dailyLog: DailyEntry[], march: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, march)
}

export function patchApril2026(dailyLog: DailyEntry[], april: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, april)
}

export function patchMay2026(dailyLog: DailyEntry[], may: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, may)
}

export function patchJune2026(dailyLog: DailyEntry[], june: DailyEntry[]): DailyEntry[] {
  return patchMonthData(dailyLog, june)
}

/** Pas alle gebundelde maand-JSON toe (dec → jun). */
export function patchAllBundledMonths(
  dailyLog: DailyEntry[],
  bundled: DailyEntry[],
): DailyEntry[] {
  if (bundled.length === 0) return dailyLog
  return patchMonthData(dailyLog, bundled)
}

function entryStamp(e: DailyEntry): string {
  return e.updatedAt ?? `${e.date}T00:00:00.000Z`
}

/** Nieuwste `updatedAt` per datum wint — voor cloud + local + bundle merge */
export function mergeByUpdatedAt(existing: DailyEntry[], incoming: DailyEntry[]): DailyEntry[] {
  const map = new Map<string, DailyEntry>()
  const add = (e: DailyEntry) => {
    const enriched = enrichEntry(e)
    const prev = map.get(enriched.date)
    if (!prev) {
      map.set(enriched.date, enriched)
      return
    }
    const keepPrev = entryStamp(prev) > entryStamp(enriched)
    if (keepPrev) {
      map.set(enriched.date, enrichEntry({ ...enriched, ...prev, date: enriched.date }))
    } else {
      map.set(enriched.date, enrichEntry({ ...prev, ...enriched }))
    }
  }
  for (const e of existing) add(e)
  for (const e of incoming) add(e)
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeDailyEntries(existing: DailyEntry[], incoming: DailyEntry[]): DailyEntry[] {
  return mergeByUpdatedAt(existing, incoming)
}

export function uid(): string {
  return crypto.randomUUID()
}

export function daysSince(dateStr: string): number {
  const d = parseISO(dateStr)
  if (!isValid(d)) return 0
  return differenceInMinutes(new Date(), d) / (60 * 24)
}
