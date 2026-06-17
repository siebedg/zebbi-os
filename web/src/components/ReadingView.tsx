import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
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
import {
  bookReadingStats,
  buildReadingChartData,
  calendarDay,
  pagesPerDayTarget,
} from '../lib/readingStats'
import { uid } from '../lib/utils'
import { Btn, Card, Input } from './ui'

function chartPalette(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        actual: '#60a5fa',
        target: '#fbbf24',
        done: '#52525b',
        grid: '#27272a',
        tick: '#71717a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#fafafa',
      }
    : {
        actual: '#2563eb',
        target: '#d97706',
        done: '#d4d4d8',
        grid: '#f4f4f5',
        tick: '#a1a1aa',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e4e4e7',
        tooltipText: '#18181b',
      }
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
  const stats = useMemo(() => bookReadingStats(book), [book])
  const data = useMemo(() => buildReadingChartData(book), [book])
  const [logOpen, setLogOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [logDay, setLogDay] = useState(String(calendarDay(book)))
  const [pages, setPages] = useState('')

  useEffect(() => {
    setLogDay(String(calendarDay(book)))
  }, [book.id, book.startDate])

  const logProgress = () => {
    const d = parseInt(logDay, 10)
    const p = parseInt(pages, 10)
    if (Number.isNaN(d) || d < 0 || d > book.daysToRead) return
    if (Number.isNaN(p) || p < 0 || p > book.pageCount) return
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

  const yMax = book.pageCount
  const yMin = Math.max(0, stats.start - 5)

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-4 pt-5 pb-2 text-center sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[var(--color-text)]">{book.title}</h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {book.pageCount} pag. · {book.daysToRead} dagen · ~{pagesPerDayTarget(book)} pag/dag
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
        <p className="text-sm text-[var(--color-muted)]">pagina&apos;s gelezen</p>
        {stats.start > 0 && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">begonnen op pag. {stats.start}</p>
        )}

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
        <StatPill label="Nodig/dag" value={stats.done ? '—' : `~${stats.paceNeeded}`} sub="pag" />
        <StatPill label="Doel/dag" value={`${stats.paceTarget}`} sub="pag" />
      </div>

      <p className="pb-1 text-center text-xs text-[var(--color-muted)]">
        Schema-dag {stats.day} · doel vandaag: {stats.targetNow} pag.
      </p>

      <div className="h-56 w-full px-2 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: isMobile ? 8 : 16, left: isMobile ? -8 : 0, bottom: 4 }}
          >
            <CartesianGrid stroke={palette.grid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: palette.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Dag', position: 'insideBottom', offset: -2, fill: palette.tick, fontSize: 10 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: palette.tick, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={isMobile ? 30 : 34}
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
              labelFormatter={(d) => (d === 0 ? 'Start' : `Dag ${d}`)}
              formatter={(v: number | null, name: string) => {
                if (v == null) return ['—', name]
                return [`${v} pag.`, name === 'target' ? 'Doellijn' : name === 'logged' ? 'Gelogd' : 'Jij']
              }}
            />
            {!isMobile && (
              <Legend
                verticalAlign="top"
                align="right"
                iconType="line"
                wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
                formatter={(value) => (value === 'target' ? 'Doellijn' : value === 'actual' ? 'Jij' : value)}
              />
            )}
            <ReferenceLine
              y={book.pageCount}
              stroke={palette.done}
              strokeDasharray="4 4"
              label={{ value: 'Klaar', fill: palette.tick, fontSize: 10, position: 'insideTopRight' }}
            />
            <Line
              type="linear"
              dataKey="target"
              stroke={palette.target}
              strokeWidth={2}
              dot={false}
              name="target"
              strokeOpacity={0.9}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={palette.actual}
              strokeWidth={2.5}
              dot={false}
              connectNulls
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="logged"
              stroke="transparent"
              dot={{ r: 4, fill: palette.actual, stroke: palette.tooltipBg, strokeWidth: 2 }}
              connectNulls={false}
              name="logged"
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="px-4 pb-3 text-center text-[10px] text-[var(--color-muted)]">
        <span className="inline-block h-0.5 w-4 align-middle" style={{ background: palette.target }} /> doellijn
        {' · '}
        <span className="inline-block h-0.5 w-4 align-middle" style={{ background: palette.actual }} /> jouw leeslijn
      </p>

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
          <div className="space-y-3 border-t border-[var(--color-border)] px-4 py-4">
            <p className="text-xs text-[var(--color-muted)]">
              Kies de dag van je schema en hoeveel pagina&apos;s je <strong>totaal</strong> gelezen hebt (cumulatief).
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Dag (0–{book.daysToRead})</label>
                <Input
                  type="number"
                  min={0}
                  max={book.daysToRead}
                  value={logDay}
                  onChange={(e) => setLogDay(e.target.value)}
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="mb-1 block text-xs text-[var(--color-muted)]">Pagina nu op (totaal)</label>
                <Input
                  type="number"
                  min={0}
                  max={book.pageCount}
                  placeholder={String(stats.read || stats.targetNow)}
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                />
              </div>
            </div>
            <Btn type="button" onClick={logProgress} className="w-full">
              Opslaan
            </Btn>
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
                    <span className="text-[var(--color-muted)]">
                      {p.day === 0 ? 'Start' : `Dag ${p.day}`}
                    </span>
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
  const [pageCount, setPageCount] = useState('100')
  const [daysToRead, setDaysToRead] = useState('10')
  const [startPageInput, setStartPageInput] = useState('0')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  const previewPace = useMemo(() => {
    const pc = parseInt(pageCount, 10)
    const days = parseInt(daysToRead, 10)
    const start = parseInt(startPageInput, 10) || 0
    if (!pc || !days) return null
    return Math.round(((pc - start) / days) * 10) / 10
  }, [pageCount, daysToRead, startPageInput])

  const addBook = () => {
    const pc = parseInt(pageCount, 10)
    const days = parseInt(daysToRead, 10)
    const sp = Math.max(0, parseInt(startPageInput, 10) || 0)
    if (!title.trim() || !pc || !days || sp >= pc) return
    onSave({
      id: uid(),
      title: title.trim(),
      pageCount: pc,
      daysToRead: days,
      startDate,
      startPage: sp > 0 ? sp : undefined,
      progress: [],
    })
    setTitle('')
    setStartPageInput('0')
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
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Oranje = ideale lijn · blauw = jouw voortgang
        </p>
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
                placeholder="Totaal pagina's"
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
            <Input
              type="number"
              min={0}
              placeholder="Al gelezen (pag.)"
              value={startPageInput}
              onChange={(e) => setStartPageInput(e.target.value)}
            />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            {previewPace != null && (
              <p className="rounded-lg bg-[var(--color-surface-overlay)] px-3 py-2 text-center text-xs text-[var(--color-muted)]">
                Doellijn: <strong className="text-[var(--color-text)]">{previewPace} pag/dag</strong> recht omhoog
                {parseInt(startPageInput, 10) > 0 && (
                  <> · start op pag. {startPageInput}</>
                )}
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
