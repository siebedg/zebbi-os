import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus, Scale, Trash2 } from 'lucide-react'
import type { WeightEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { Btn, Card, Input, SectionTitle } from './ui'

function chartTheme(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { grid: '#3f3f46', tick: '#a1a1aa', tooltipBg: '#18181b', tooltipBorder: '#3f3f46', tooltipText: '#fafafa' }
    : { grid: '#e4e4e7', tick: '#71717a', tooltipBg: '#ffffff', tooltipBorder: '#e4e4e7', tooltipText: '#18181b' }
}

export function WeightView({
  entries,
  onUpsert,
  onDelete,
}: {
  entries: WeightEntry[]
  onUpsert: (e: WeightEntry) => void
  onDelete: (date: string) => void
}) {
  const { theme } = useTheme()
  const ct = chartTheme(theme)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [kg, setKg] = useState('')

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  )

  const chartData = useMemo(
    () =>
      sorted.map((e) => ({
        label: format(parseISO(e.date), 'd MMM', { locale: nl }),
        date: e.date,
        kg: e.kg,
      })),
    [sorted],
  )

  const domain = useMemo(() => {
    if (sorted.length === 0) return [65, 80]
    const vals = sorted.map((e) => e.kg)
    const min = Math.floor(Math.min(...vals) - 1)
    const max = Math.ceil(Math.max(...vals) + 1)
    return [min, max]
  }, [sorted])

  const add = () => {
    const w = parseFloat(kg.replace(',', '.'))
    if (!date || Number.isNaN(w)) return
    onUpsert({ date, kg: Math.round(w * 100) / 100 })
    setKg('')
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="Wekelijkse metingen — opgeslagen in cloud">Gewicht</SectionTitle>

      <Card className="p-5">
        <div className="h-64 w-full">
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
              Minstens 2 metingen voor de grafiek
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="label" tick={{ fill: ct.tick, fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  domain={domain}
                  tick={{ fill: ct.tick, fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: ct.tooltipBg,
                    border: `1px solid ${ct.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: ct.tooltipText,
                  }}
                  formatter={(v: number) => [`${v} kg`, 'Gewicht']}
                />
                <Line type="monotone" dataKey="kg" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <Scale className="h-4 w-4" />
          Nieuwe meting
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Datum</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">kg</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="71.5"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              className="w-24"
            />
          </div>
          <Btn type="button" onClick={add} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Opslaan
          </Btn>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
              <th className="px-4 py-2 text-left font-medium text-[var(--color-muted)]">Datum</th>
              <th className="px-4 py-2 text-right font-medium text-[var(--color-muted)]">kg</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {[...sorted].reverse().map((e) => (
              <tr key={e.date} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-2 text-[var(--color-text)]">
                  {format(parseISO(e.date), 'd MMM yyyy', { locale: nl })}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--color-text)]">{e.kg}</td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onDelete(e.date)}
                    className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-bad)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
