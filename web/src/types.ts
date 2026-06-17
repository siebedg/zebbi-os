export interface DeepWorkSession {
  id: string
  startTime: string
  endTime: string
  focusPercent: number
  distraction?: string
  description?: string
  /** When only duration given e.g. "2h 35m" */
  durationHours?: number
}

export type DayType = 'normal' | 'rest' | 'vacation' | 'travel'

export interface DailyEntry {
  date: string
  /** ISO timestamp — nieuwste wint bij sync tussen apparaten */
  updatedAt?: string
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
  sessions?: DeepWorkSession[]
  avgFocus?: number
  totalHoursWorked?: number
  totalHoursNet?: number
  timetable?: number
  notes?: string
  /** @deprecated legacy excel import */
  deepWork1?: number
  deepWork2?: number
  deepWork3?: number
  deepWork4?: number
  deepWork5?: number
  deepWork6?: number
  totalDeepWork?: number
}

export interface AppState {
  dailyLog: DailyEntry[]
  readingBooks?: ReadingBook[]
  weightLog?: WeightEntry[]
  /** Laatste cloud-save timestamp */
  stateUpdatedAt?: string
}

export interface ReadingProgress {
  day: number
  pages: number
}

export interface ReadingBook {
  id: string
  title: string
  pageCount: number
  daysToRead: number
  startDate: string
  /** Pagina's al gelezen vóór dag 1 van dit schema */
  startPage?: number
  progress: ReadingProgress[]
  updatedAt?: string
}

export interface WeightEntry {
  date: string
  kg: number
  updatedAt?: string
}

export type TabId = 'entry' | 'timeline' | 'charts' | 'trend'

export const MAX_SESSIONS = 8

/** Sleep score (% from tracker) only reliable from Jan 2026 onward */
export const SLEEP_SCORE_TRACKED_FROM = '2026-01-01'

/** Paris vacation in Excel uses #4A86E8 (wake–med) + #E06666 (work–tt) */
export const VACATION_DATES = [
  '2026-02-20',
  '2026-02-21',
  '2026-02-22',
  '2026-02-23',
  '2026-02-24',
  '2026-02-25',
  '2026-02-26',
  '2026-02-27',
  '2026-02-28',
]

/** Vaste rustdagen — geen deep work / timetable */
export const REST_DATES = [
  '2026-01-05',
  '2026-01-12',
  '2026-01-19',
  '2026-01-26',
  '2026-01-31',
  '2026-02-01',
  '2026-02-09',
  '2026-02-16',
  '2026-03-01',
  '2026-03-08',
  '2026-03-15',
  '2026-03-22',
  '2026-03-28',
  '2026-03-29',
  '2026-04-05',
  '2026-04-12',
  '2026-04-18',
  '2026-04-19',
] as const
