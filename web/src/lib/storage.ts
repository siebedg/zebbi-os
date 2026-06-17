import type { AppState } from '../types'
import { enrichEntry } from './sessions'
import { isValidDateStr, normalizeImportedRow } from './utils'

const STORAGE_KEY = 'improvement-dashboard-v6'

export const defaultState: AppState = { dailyLog: [], readingBooks: [], weightLog: [] }

function migrate(raw: Record<string, unknown>): AppState {
  const dailyLog = ((raw.dailyLog as AppState['dailyLog']) ?? [])
    .filter((e) => e?.date && isValidDateStr(e.date))
    .map((e) => {
      const next = { ...e }
      if (next.date < '2026-01-01') delete next.sleepScore
      return enrichEntry(next)
    })
  const readingBooks = Array.isArray(raw.readingBooks) ? (raw.readingBooks as AppState['readingBooks']) : []
  const weightLog = Array.isArray(raw.weightLog) ? (raw.weightLog as AppState['weightLog']) : []
  const stateUpdatedAt = typeof raw.stateUpdatedAt === 'string' ? raw.stateUpdatedAt : undefined
  return { dailyLog, readingBooks: readingBooks ?? [], weightLog: weightLog ?? [], stateUpdatedAt }
}

export function loadState(): AppState {
  try {
    for (const key of [
      'improvement-dashboard-v6',
      'improvement-dashboard-v5',
      'improvement-dashboard-v4',
      'improvement-dashboard-v3',
      'improvement-dashboard-v2',
      'improvement-dashboard-v1',
    ]) {
      const raw = localStorage.getItem(key)
      if (raw) return migrate(JSON.parse(raw))
    }
    return { ...defaultState }
  } catch {
    return { ...defaultState }
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export async function loadSeedData(): Promise<AppState['dailyLog']> {
  const res = await fetch('/seed-daily-log.json')
  const raw = await res.json()
  return raw
    .map((row: Record<string, unknown>) => normalizeImportedRow(row))
    .filter(Boolean)
    .map(enrichEntry)
}

export async function loadBundledMonth(file: string): Promise<AppState['dailyLog']> {
  const res = await fetch(`/${file}`)
  if (!res.ok) return []
  const raw = await res.json()
  if (!Array.isArray(raw)) return []
  return raw
    .map((row: Record<string, unknown>) => normalizeImportedRow(row))
    .filter(Boolean)
    .map(enrichEntry)
}

/** Gebundelde maanden — zelfde bron als dec–apr, ook op Vercel beschikbaar */
export const BUNDLED_MONTH_FILES = [
  'december-2025.json',
  'january-2026.json',
  'february-2026.json',
  'march-2026.json',
  'april-2026.json',
  'may-2026.json',
  'june-2026.json',
] as const

export async function loadAllBundledMonths(): Promise<AppState['dailyLog']> {
  const chunks = await Promise.all(BUNDLED_MONTH_FILES.map(loadBundledMonth))
  return chunks.flat()
}

export async function loadDecember2025(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('december-2025.json')
}

export async function loadJanuary2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('january-2026.json')
}

export async function loadFebruary2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('february-2026.json')
}

export async function loadMarch2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('march-2026.json')
}

export async function loadApril2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('april-2026.json')
}

export async function loadMay2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('may-2026.json')
}

export async function loadJune2026(): Promise<AppState['dailyLog']> {
  return loadBundledMonth('june-2026.json')
}
