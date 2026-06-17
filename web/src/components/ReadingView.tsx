import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import type { ReadingBook } from '../types'
import { useTheme } from '../hooks/useTheme'
import { uid } from '../lib/utils'
import { Btn, Card, Input, SectionTitle } from './ui'

function chartTheme(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { grid: '#3f3f46', tick: '#a1a1aa', tooltipBg: '#18181b', tooltipBorder: '#3f3f46', tooltipText: '#fafafa' }
    : { grid: '#e4e4e7', tick: '#71717a', tooltipBg: '#ffffff', tooltipBorder: '#e4e4e7', tooltipText: '#18181b' }
}

function buildChartData(book: ReadingBook) {
  const progressMap = new Map(book.progress.map((p) => [p.day, p.pages]))
  const targetPerDay = book.pageCount / book.daysToRead
  const rows = []
  for (let day = 1; day <= book.daysToRead; day++) {
    rows.push({
      day,
      target: Math.min(book.pageCount, Math.round(targetPerDay * day)),
      actual: progressMap.get(day) ?? null,
    })
  }
  return rows
}

function lastProgress(book: ReadingBook): number {
  if (book.progress.length === 0) return 0
  return Math.max(...book.progress.map((p) => p.pages))
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
  const ct = chartTheme(theme)
  const data = useMemo(() => buildChartData(book), [book])
  const done = lastProgress(book) >= book.pageCount
  const [day, setDay] = useState(String(book.progress.length + 1))
  const [pages, setPages] = useState('')

  const logProgress = () => {
    const d = parseInt(day, 10)
    const p = parseInt(pages, 10)
    if (!d || !p || d < 1 || d > book.daysToRead) return
    const next = book.progress.filter((x) => x.day !== d)
    next.push({ day: d, pages: p })
    next.sort((a, b) => a.day - b.day)
    onSave({ ...book, progress: next })
    setPages('')
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">{book.title}</h3>
          <p className="text-xs text-[var(--color-muted)]">
            {book.pageCount} pag. · {book.daysToRead} dagen · start{' '}
            {format(parseISO(book.startDate), 'd MMM yyyy', { locale: nl })}
            {done && ' · afgerond'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(book.id)}
          className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-bad)]"
          title="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.tick, fontSize: 10 }}
              label={{ value: 'Dag', position: 'insideBottom', offset: -2, fill: ct.tick, fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: ct.tick, fontSize: 10 }}
              domain={[0, book.pageCount]}
              label={{ value: 'Pagina', angle: -90, position: 'insideLeft', fill: ct.tick, fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: ct.tooltipBg,
                border: `1px solid ${ct.tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
                color: ct.tooltipText,
              }}
              formatter={(v: number | null, name: string) => [
                v == null ? '—' : v,
                name === 'target' ? 'Doel' : 'Gelezen',
              ]}
            />
            <ReferenceLine
              y={book.pageCount}
              stroke={ct.tick}
              strokeDasharray="4 4"
              label={{ value: 'Klaar', fill: ct.tick, fontSize: 10, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#a1a1aa"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1.5}
              name="target"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb' }}
              connectNulls={false}
              name="actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-4">
        <div className="w-16">
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Dag</label>
          <Input type="number" min={1} max={book.daysToRead} value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Pagina (totaal)</label>
          <Input type="number" min={0} max={book.pageCount} value={pages} onChange={(e) => setPages(e.target.value)} />
        </div>
        <Btn type="button" variant="ghost" onClick={logProgress}>
          Log
        </Btn>
      </div>
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
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="Pagina's vs. dagen — stippellijn = leestempo, blauw = jouw voortgang">
        Lezen
      </SectionTitle>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <BookOpen className="h-4 w-4" />
          Nieuw boek
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="number" placeholder="Pagina's" value={pageCount} onChange={(e) => setPageCount(e.target.value)} />
          <Input type="number" placeholder="Dagen" value={daysToRead} onChange={(e) => setDaysToRead(e.target.value)} />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Btn type="button" onClick={addBook} className="inline-flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" />
            Toevoegen
          </Btn>
        </div>
      </Card>

      {books.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">Nog geen boeken — voeg er een toe.</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {[...books].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((book) => (
            <BookCard key={book.id} book={book} onSave={onSave} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
