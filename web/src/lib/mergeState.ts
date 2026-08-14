import type { AppState, DailyEntry, OscillationProtocol, ReadingBook, ShutdownTemplate, WeightEntry } from '../types'
import { createDefaultShutdownTemplates, normalizeShutdownTemplate } from './shutdown'
import { normalizeOscillationProtocol } from './oscillationProtocol'
import { enrichEntry } from './sessions'
import { mergeByUpdatedAt } from './utils'

function stamp(e: { updatedAt?: string; date?: string }): string {
  return e.updatedAt ?? (e.date ? `${e.date}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z')
}

export function mergeReadingBooks(a: ReadingBook[], b: ReadingBook[]): ReadingBook[] {
  const map = new Map<string, ReadingBook>()
  const add = (book: ReadingBook) => {
    const prev = map.get(book.id)
    if (!prev || stamp(book) >= stamp(prev)) map.set(book.id, book)
  }
  for (const x of a) add(x)
  for (const x of b) add(x)
  return [...map.values()].sort((x, y) => y.startDate.localeCompare(x.startDate))
}

export function mergeWeightLog(a: WeightEntry[], b: WeightEntry[]): WeightEntry[] {
  const map = new Map<string, WeightEntry>()
  const add = (e: WeightEntry) => {
    const prev = map.get(e.date)
    if (!prev || stamp(e) >= stamp(prev)) map.set(e.date, e)
  }
  for (const x of a) add(x)
  for (const x of b) add(x)
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date))
}

export function mergeShutdownTemplates(a: ShutdownTemplate[], b: ShutdownTemplate[]): ShutdownTemplate[] {
  const map = new Map<string, ShutdownTemplate>()
  const add = (template: ShutdownTemplate) => {
    const normalized = normalizeShutdownTemplate(template)
    const prev = map.get(normalized.id)
    if (!prev || stamp(normalized) >= stamp(prev)) map.set(normalized.id, normalized)
  }
  for (const x of a) add(x)
  for (const x of b) add(x)
  return [...map.values()].sort((x, y) => x.name.localeCompare(y.name))
}

function mergeProtocol(
  a?: OscillationProtocol,
  b?: OscillationProtocol,
): OscillationProtocol {
  const left = a ? normalizeOscillationProtocol(a) : null
  const right = b ? normalizeOscillationProtocol(b) : null
  if (!left) return right ?? normalizeOscillationProtocol()
  if (!right) return left
  return (right.updatedAt ?? '') >= (left.updatedAt ?? '') ? right : left
}

export function mergeAppState(base: AppState, incoming: Partial<AppState>): AppState {
  const dailyLog = mergeByUpdatedAt(
    base.dailyLog,
    (incoming.dailyLog ?? []).map((e) => enrichEntry(e)),
  )
  const readingBooks = mergeReadingBooks(base.readingBooks ?? [], incoming.readingBooks ?? [])
  const weightLog = mergeWeightLog(base.weightLog ?? [], incoming.weightLog ?? [])
  const shutdownTemplates = mergeShutdownTemplates(
    base.shutdownTemplates ?? createDefaultShutdownTemplates(),
    incoming.shutdownTemplates ?? [],
  )
  const activeShutdownTemplateId =
    incoming.activeShutdownTemplateId ??
    base.activeShutdownTemplateId ??
    shutdownTemplates[0]?.id
  const oscillationProtocol = mergeProtocol(base.oscillationProtocol, incoming.oscillationProtocol)
  const stateUpdatedAt = [base.stateUpdatedAt, incoming.stateUpdatedAt]
    .filter(Boolean)
    .sort()
    .pop()
  return {
    dailyLog,
    readingBooks,
    weightLog,
    shutdownTemplates,
    activeShutdownTemplateId,
    oscillationProtocol,
    stateUpdatedAt,
  }
}

export function normalizeRemoteState(raw: Record<string, unknown>): AppState {
  const dailyLog = Array.isArray(raw.dailyLog)
    ? (raw.dailyLog as DailyEntry[]).map((e) => enrichEntry(e))
    : []
  const readingBooks = Array.isArray(raw.readingBooks) ? (raw.readingBooks as ReadingBook[]) : []
  const weightLog = Array.isArray(raw.weightLog) ? (raw.weightLog as WeightEntry[]) : []
  const shutdownTemplates = Array.isArray(raw.shutdownTemplates)
    ? (raw.shutdownTemplates as ShutdownTemplate[]).map((t) => normalizeShutdownTemplate(t))
    : createDefaultShutdownTemplates()
  const activeShutdownTemplateId =
    typeof raw.activeShutdownTemplateId === 'string' ? raw.activeShutdownTemplateId : shutdownTemplates[0]?.id
  const oscillationProtocol = raw.oscillationProtocol
    ? normalizeOscillationProtocol(raw.oscillationProtocol as OscillationProtocol)
    : undefined
  const stateUpdatedAt = typeof raw.savedAt === 'string' ? raw.savedAt : undefined
  return {
    dailyLog,
    readingBooks,
    weightLog,
    shutdownTemplates,
    activeShutdownTemplateId,
    oscillationProtocol,
    stateUpdatedAt,
  }
}
