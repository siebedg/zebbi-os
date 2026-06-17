import { useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { ReadingBook } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { uid } from '../lib/utils'
import { Btn, Card, Input } from './ui'

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        actual: '#60a5fa',
        actualFill: '#60a5fa44',
        actualFillEnd: '#60a5fa08',
        target: '#71717a',
        done: '#52525b',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        actual: '#2563eb',
        actualFill: '#2563eb44',
        actualFillEnd: '#2563eb08',
        target: '#a1a1aa',
        done: '#d4d4d8',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
}

function pagesRead(book: ReadingBook): number {
  if (book.progress.length === 0) return 0
  return Math.max(...book.progress.map((p) => p.pages))
}

function calendarDay(book: ReadingBook, ref = new Date()): number {
  const d = differenceInCalendarDays(ref, parseISO(book.startDate)) + 1
  return Math.max(1, Math.min(book.daysToRead, d))
}

function targetPages(book: ReadingBook, day: number): number {
  return Math.min(book.pageCount, Math.round((day / book.daysToRead) * book.pageCount))
}

function bookStats(book: ReadingBook) {
  const read = pagesRead(book)
  const left = Math.max(0, book.pageCount - read)
  const day = calendarDay(book)
  const daysLeft = Math.max(0, book.daysToRead - day + 1)
  const targetNow = targetPages(book, day)
  const pct = Math.min(100, Math.round((read / book.pageCount) * 100))
  const done = read >= book.pageCount
  const paceTarget = Math.round((book.pageCount / book.daysToRead) * 10) / 10
  const paceNeeded = daysLeft > 0 && !done ? Math.ceil((left / daysLeft) * 10) / 10 : 0
  const ahead = read - targetNow
  const endDate = addDays(parseISO(book.startDate), book.daysToRead - 1)

  let status: { text: string; tone: 'good' | 'warn' | 'neutral' | 'done' }
  if (done) status = { text: 'Boek afgerond', tone: 'done' }
  else if (ahead >= 15) status = { text: `${ahead} pag. voor op schema`, tone: 'good' }
  else if (ahead >= 0) status = { text: 'Op schema', tone: 'good' }
  else if (ahead > -20) status = { text: `${Math.abs(ahead)} pag. achter`, tone: 'warn' }
  else status = { text: `${Math.abs(ahead)} pag. achter — tempo omhoog`, tone: 'warn' }

  return {
    read,
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

function buildChartData(book: ReadingBook) {
  const progressMap = new Map(book.progress.map((p) => [p.day, p.pages]))
  const rows = []
  for (let day = 1; day <= book.daysToRead; day++) {
    rows.push({
      day,
      target: targetPages(book, day),
      actual: progressMap.get(day) ?? null,
    })
  }
  return rows
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-overlay)] px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  )
}

function BookCard({
  book,
  onSave,
  onDelete,
}: {
  book: ReadingBook
  onSave: (b: ReadingBook) => void
  onDelete: (id: string) => void
}) {
  const { theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const palette = chartPalette(theme)
  const stats = useMemo(() => bookStats(book), [book])
  const data = useMemo(() => buildChartData(book), [book])
  const [logOpen, setLogOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pages, setPages] = useState('')

  const logToday = () => {
    const p = parseInt(pages, 10)
    if (Number.isNaN(p) || p < 0 || p > book.pageCount) return
    const d = calendarDay(book)
    const next = book.progress.filter((x) => x.day !== d)
    next.push({ day: d, pages: p })
    next.sort((a, b) => a.day - b.day)
    onSave({ ...book, progress: next })
    setPages('')
    setLogOpen(false)
  }

  const statusColor =
    stats.status.tone === 'done' || stats.status.tone === 'good'
      ? 'text-[var(--color-good)]'
      : stats.status.tone === 'warn'
        ? 'text-[var(--color-warn)]'
        : 'text-[var(--color-muted)]'

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-4 pt-5 pb-2 text-center sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[var(--color-text)]">{book.title}</h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {format(parseISO(book.startDate), 'd MMM', { locale: nl })} →{' '}
              {format(stats.endDate, 'd MMM yyyy', { locale: nl })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(book.id)}
            className="shrink-0 rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-bad)]"
            aria-label="Verwijderen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">Voortgang</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-[var(--color-text)] sm:text-5xl">
          {stats.read}
          <span className="text-xl font-normal text-[var(--color-muted)] sm:text-2xl">
            {' '}
            / {book.pageCount}
          </span>
        </p>
        <p className="text-sm text-[var(--color-muted)]">pagina&apos;s</p>

        <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-[var(--color-surface-overlay)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <p className={`mt-2 text-sm font-medium ${statusColor}`}>{stats.status.text}</p>
      </div>

      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4">
        <StatPill label="Nog te lezen" value={`${stats.left}`} sub="pagina's" />
        <StatPill label="Dagen over" value={`${stats.daysLeft}`} sub={`van ${book.daysToRead}`} />
        <StatPill
          label="Vandaag nodig"
          value={stats.done ? '—' : `~${stats.paceNeeded}`}
          sub="pag/dag"
        />
        <StatPill label="Doeltempo" value={`${stats.paceTarget}`} sub="pag/dag" />
      </div>

      <p className="pb-2 text-center text-xs text-[var(--color-muted)]">
        Dag {stats.day} van {book.daysToRead}
        {!stats.done && stats.ahead !== 0 && (
          <span className="text-[var(--color-muted)]">
            {' '}
            · doel vandaag: {stats.targetNow} pag.
          </span>
        )}
      </p>

      <div className="h-52 w-full px-1 sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -12 : -4, bottom: 4 }}>
            <defs>
              <linearGradient id={`readFill-${book.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.actualFill} />
                <stop offset="100%" stopColor={palette.actualFillEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={palette.grid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: palette.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Dag', position: 'insideBottom', offset: -2, fill: palette.tick, fontSize: 10 }}
            />
            <YAxis
              domain={[0, book.pageCount]}
              tick={{ fill: palette.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={isMobile ? 28 : 32}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                background: palette.tooltipBg,
                border: `1px solid ${palette.tooltipBorder}`,
                borderRadius: 12,
                fontSize: 13,
                color: palette.tooltipText,
              }}
              formatter={(v: number | null, name: string) => [
                v == null ? '—' : `${v} pag.`,
                name === 'target' ? 'Doel' : 'Jij',
              ]}
              labelFormatter={(d) => `Dag ${d}`}
            />
            <ReferenceLine
              y={book.pageCount}
              stroke={palette.done}
              strokeDasharray="4 4"
              label={{ value: 'Klaar', fill: palette.tick, fontSize: 10, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke={palette.target}
              strokeDasharray="6 4"
              dot={false}
              strokeWidth={1.5}
              name="target"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke={palette.actual}
              strokeWidth={2.5}
              fill={`url(#readFill-${book.id})`}
              dot={false}
              activeDot={{ r: 5, fill: palette.actual, stroke: palette.tooltipBg, strokeWidth: 2 }}
              connectNulls={false}
              name="actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setLogOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span>Voortgang loggen</span>
          <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition ${logOpen ? 'rotate-180' : ''}`} />
        </button>
        {logOpen && (
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              Hoeveel pagina&apos;s ben je nu totaal? (dag {stats.day} wordt automatisch gebruikt)
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Pagina nu op</label>
                <Input
                  type="number"
                  min={0}
                  max={book.pageCount}
                  placeholder={String(stats.read || stats.targetNow)}
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                />
              </div>
              <Btn type="button" onClick={logToday} className="w-full sm:w-auto">
                Opslaan
              </Btn>
            </div>
          </div>
        )}
      </div>

      {book.progress.length > 0 && (
        <div className="border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
          >
            <span>
              Logboek <span className="font-normal text-[var(--color-muted)]">({book.progress.length})</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[var(--color-muted)] transition ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
            <div className="max-h-40 overflow-y-auto border-t border-[var(--color-border)] scroll-touch">
              {[...book.progress]
                .sort((a, b) => b.day - a.day)
                .map((p) => (
                  <div
                    key={p.day}
                    className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5 text-sm last:border-0"
                  >
                    <span className="text-[var(--color-muted)]">Dag {p.day}</span>
                    <span className="font-mono tabular-nums text-[var(--color-text)]">{p.pages} pag.</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function ReadingView({
  books,
  onSave,
  onDelete,
}: {
  books: ReadingBook[]
  onSave: (b: ReadingBook) => void
  onDelete: (id: string) => void
}) {
  const [addOpen, setAddOpen] = useState(books.length === 0)
  const [title, setTitle] = useState('')
  const [pageCount, setPageCount] = useState('300')
  const [daysToRead, setDaysToRead] = useState('14')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const addBook = () => {
    const pc = parseInt(pageCount, 10)
    const days = parseInt(daysToRead, 10)
    if (!title.trim() || !pc || !days) return
    onSave({
      id: uid(),
      title: title.trim(),
      pageCount: pc,
      daysToRead: days,
      startDate,
      progress: [],
    })
    setTitle('')
    setAddOpen(false)
  }

  const sorted = useMemo(
    () => [...books].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [books],
  )

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">Lezen</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Pagina&apos;s vs. dagen — stippellijn = doeltempo</p>
      </div>

      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-overlay)]"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--color-muted)]" />
            Nieuw boek
          </span>
          <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition ${addOpen ? 'rotate-180' : ''}`} />
        </button>
        {addOpen && (
          <div className="space-y-3 border-t border-[var(--color-border)] px-4 py-4">
            <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Pagina's"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Dagen"
                value={daysToRead}
                onChange={(e) => setDaysToRead(e.target.value)}
              />
            </div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            {pageCount && daysToRead && (
              <p className="text-center text-xs text-[var(--color-muted)]">
                ~{Math.round(parseInt(pageCount, 10) / parseInt(daysToRead, 10))} pag/dag om op tijd klaar te zijn
              </p>
            )}
            <Btn type="button" onClick={addBook} className="w-full">
              <Plus className="h-4 w-4" />
              Toevoegen
            </Btn>
          </div>
        )}
      </Card>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
          Nog geen boeken — voeg er een toe.
        </Card>
      ) : (
        sorted.map((book) => (
          <BookCard key={book.id} book={book} onSave={onSave} onDelete={onDelete} />
        ))
      )}
    </div>
  )
}
