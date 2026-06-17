import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
import type { ReadingBook } from '../types'

export function startPage(book: ReadingBook): number {
  return Math.max(0, book.startPage ?? 0)
}

/** Cumulatief gelezen (incl. startpagina) */
export function pagesRead(book: ReadingBook): number {
  const base = startPage(book)
  if (book.progress.length === 0) return base
  return Math.max(base, ...book.progress.map((p) => p.pages))
}

export function calendarDay(book: ReadingBook, ref = new Date()): number {
  const d = differenceInCalendarDays(ref, parseISO(book.startDate)) + 1
  return Math.max(1, Math.min(book.daysToRead, d))
}

/** Lineair doel: dag 0 = startPage, dag N = pageCount */
export function targetPages(book: ReadingBook, day: number): number {
  const start = startPage(book)
  if (day <= 0) return start
  const span = book.pageCount - start
  return Math.min(book.pageCount, start + (span * day) / book.daysToRead)
}

export function pagesPerDayTarget(book: ReadingBook): number {
  const span = book.pageCount - startPage(book)
  return Math.round((span / book.daysToRead) * 10) / 10
}

export type ReadingChartRow = {
  day: number
  target: number
  actual: number | null
  logged: number | null
}

export function buildReadingChartData(book: ReadingBook): ReadingChartRow[] {
  const start = startPage(book)
  const progressMap = new Map(book.progress.map((p) => [p.day, p.pages]))
  const rows: ReadingChartRow[] = []
  let lastActual: number | null = start > 0 ? start : null

  for (let day = 0; day <= book.daysToRead; day++) {
    const target = targetPages(book, day)
    const loggedToday = progressMap.has(day) ? progressMap.get(day)! : null
    if (loggedToday != null) lastActual = loggedToday

    rows.push({
      day,
      target: Math.round(target * 10) / 10,
      actual: lastActual,
      logged: loggedToday,
    })
  }
  return rows
}

export function bookReadingStats(book: ReadingBook) {
  const read = pagesRead(book)
  const start = startPage(book)
  const left = Math.max(0, book.pageCount - read)
  const day = calendarDay(book)
  const daysLeft = Math.max(0, book.daysToRead - day + 1)
  const targetNow = Math.round(targetPages(book, day))
  const span = book.pageCount - start
  const pct = span > 0 ? Math.min(100, Math.round(((read - start) / span) * 100)) : 100
  const done = read >= book.pageCount
  const paceTarget = pagesPerDayTarget(book)
  const paceNeeded = daysLeft > 0 && !done ? Math.ceil((left / daysLeft) * 10) / 10 : 0
  const ahead = read - targetNow
  const endDate = addDays(parseISO(book.startDate), book.daysToRead - 1)

  let status: { text: string; tone: 'good' | 'warn' | 'neutral' | 'done' }
  if (done) status = { text: 'Boek afgerond', tone: 'done' }
  else if (ahead >= 10) status = { text: `${ahead} pag. voor op schema`, tone: 'good' }
  else if (ahead >= 0) status = { text: 'Op schema', tone: 'good' }
  else if (ahead > -15) status = { text: `${Math.abs(ahead)} pag. achter`, tone: 'warn' }
  else status = { text: `${Math.abs(ahead)} pag. achter — tempo omhoog`, tone: 'warn' }

  return {
    read,
    start,
    left,
    day,
    daysLeft,
    targetNow,
    pct,
    done,
    paceTarget,
    paceNeeded,
    ahead,
    endDate,
    status,
  }
}
