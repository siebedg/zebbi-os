import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { enrichEntry } from '../lib/sessions'
import { entryHasData, formatChartLabel, isValidDateStr } from '../lib/utils'
import { Card, SectionTitle } from './ui'

function ChartBox({ children, tall }: { children: React.ReactElement; tall?: boolean }) {
  return (
    <div className={`w-full ${tall ? 'h-64 sm:h-72' : 'h-56 sm:h-64'}`} style={{ minHeight: tall ? 256 : 224 }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function normalizeSleepScore(score?: number): number | null {
  if (score == null || Number.isNaN(score)) return null
  const pct = score <= 1 ? score * 100 : score > 100 ? score / 100 : score
  return Math.round(Math.min(100, Math.max(0, pct)))
}

export function Charts({ entries }: { entries: DailyEntry[] }) {
  const { theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const chartMargin = isMobile
    ? { top: 8, right: 8, left: 0, bottom: 4 }
    : { top: 12, right: 16, left: 4, bottom: 4 }
  const yAxisWidth = isMobile ? 36 : 42

  const chartTheme = useMemo(
    () =>
      theme === 'dark'
        ? {
            tooltip: {
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 12,
              fontSize: 13,
              color: '#fafafa',
            },
            grid: '#27272a',
            tick: '#a1a1aa',
          }
        : {
            tooltip: {
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 12,
              fontSize: 13,
              color: '#18181b',
            },
            grid: '#f4f4f5',
            tick: '#71717a',
          },
    [theme],
  )

  const data = useMemo(() => {
    return entries
      .filter((e) => entryHasData(e) && isValidDateStr(e.date))
      .map(enrichEntry)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-45)
      .map((e) => ({
        label: formatChartLabel(e.date),
        sleepHours: e.sleepHours ?? null,
        sleepScore: normalizeSleepScore(e.sleepScore),
        meditation: e.meditation ?? null,
        avgFocus: e.avgFocus ?? null,
        totalWorked: e.totalHoursWorked ?? e.totalDeepWork ?? null,
        timetable: e.timetable ?? null,
      }))
  }, [entries])

  if (data.length < 2) {
    return (
      <Card className="p-5">
        <p className="text-sm text-[var(--color-muted)]">Nog niet genoeg data voor grafieken (min. 2 dagen).</p>
      </Card>
    )
  }

  const tick = { fill: chartTheme.tick, fontSize: isMobile ? 10 : 11 }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <SectionTitle sub="Laatste ~45 dagen · één metric per grafiek">Grafieken</SectionTitle>

      <Card className="p-4 sm:p-5">
        <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Sleep score</p>
        <p className="mb-3 text-xs text-[var(--color-muted)]">Whoop / handmatig · %</p>
        <ChartBox tall>
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={28} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={tick} width={yAxisWidth} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [`${v}%`, 'Score']} />
            <Area type="monotone" dataKey="sleepScore" stroke="#16a34a" fill={theme === 'dark' ? '#14532d55' : '#dcfce7'} strokeWidth={2.5} connectNulls dot={false} />
          </AreaChart>
        </ChartBox>
      </Card>

      <Card className="p-4 sm:p-5">
        <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Deep work</p>
        <p className="mb-3 text-xs text-[var(--color-muted)]">Totaal uren per dag</p>
        <ChartBox tall>
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={28} axisLine={false} tickLine={false} />
            <YAxis tick={tick} width={yAxisWidth} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [`${v}u`, 'Worked']} />
            <Bar dataKey="totalWorked" fill="#ca8a04" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartBox>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Focus</p>
          <p className="mb-3 text-xs text-[var(--color-muted)]">Gemiddelde focus %</p>
          <ChartBox>
            <AreaChart data={data} margin={chartMargin}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={24} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={tick} width={yAxisWidth} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [`${v}%`, 'Focus']} />
              <Area type="monotone" dataKey="avgFocus" stroke="#2563eb" fill={theme === 'dark' ? '#1e3a8a44' : '#dbeafe'} strokeWidth={2} connectNulls />
            </AreaChart>
          </ChartBox>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Meditatie</p>
          <p className="mb-3 text-xs text-[var(--color-muted)]">Minuten per dag</p>
          <ChartBox>
            <BarChart data={data} margin={chartMargin}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={24} axisLine={false} tickLine={false} />
              <YAxis tick={tick} width={yAxisWidth} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [`${v} min`, 'Med']} />
              <Bar dataKey="meditation" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">Timetable</p>
        <p className="mb-3 text-xs text-[var(--color-muted)]">Adherence %</p>
        <ChartBox>
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={28} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={tick} width={yAxisWidth} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTheme.tooltip} formatter={(v: number) => [`${v}%`, 'TT']} />
            <Area type="monotone" dataKey="timetable" stroke="#ca8a04" fill={theme === 'dark' ? '#713f1244' : '#fef9c3'} strokeWidth={2} connectNulls />
          </AreaChart>
        </ChartBox>
      </Card>
    </div>
  )
}
