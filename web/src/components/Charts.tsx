import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { enrichEntry } from '../lib/sessions'
import { entryHasData, formatChartLabel, isValidDateStr } from '../lib/utils'
import { Card, SectionTitle } from './ui'

function ChartBox({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-56 w-full" style={{ minHeight: 224 }}>
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

  const chartTheme = useMemo(
    () =>
      theme === 'dark'
        ? {
            tooltip: {
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
              color: '#fafafa',
            },
            grid: '#3f3f46',
            tick: '#a1a1aa',
          }
        : {
            tooltip: {
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: '#18181b',
            },
            grid: '#e4e4e7',
            tick: '#71717a',
          },
    [theme],
  )

  const data = useMemo(() => {
    return entries
      .filter((e) => entryHasData(e) && isValidDateStr(e.date))
      .map(enrichEntry)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60)
      .map((e) => ({
        label: formatChartLabel(e.date),
        sleepHours: e.sleepHours ?? null,
        sleepScore: normalizeSleepScore(e.sleepScore),
        meditation: e.meditation ?? null,
        avgFocus: e.avgFocus ?? null,
        totalWorked: e.totalHoursWorked ?? e.totalDeepWork ?? null,
        totalNet: e.totalHoursNet ?? null,
        timetable: e.timetable ?? null,
      }))
  }, [entries])

  if (data.length < 2) {
    return (
      <Card className="p-5">
        <p className="text-sm text-[var(--color-muted)]">
          Nog niet genoeg data voor grafieken (min. 2 dagen).
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <SectionTitle sub="Slaapuren & slaapscore">Slaap</SectionTitle>
        <ChartBox>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.tick }} />
            <Line yAxisId="left" type="monotone" dataKey="sleepHours" name="Uren" stroke="#2563eb" dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="sleepScore" name="Score %" stroke="#16a34a" dot={false} connectNulls />
          </LineChart>
        </ChartBox>
      </Card>

      <Card className="p-5">
        <SectionTitle sub="Worked vs net hours & focus">Deep work</SectionTitle>
        <ChartBox>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 10 }} />
            <YAxis yAxisId="hours" tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} />
            <YAxis yAxisId="focus" orientation="right" tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} domain={[0, 100]} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.tick }} />
            <Area yAxisId="hours" type="monotone" dataKey="totalWorked" name="Worked (u)" stroke="#ca8a04" fill={theme === 'dark' ? '#713f1244' : '#fef9c3'} connectNulls />
            <Area yAxisId="hours" type="monotone" dataKey="totalNet" name="Net (u)" stroke="#16a34a" fill={theme === 'dark' ? '#14532d44' : '#dcfce7'} connectNulls />
            <Area yAxisId="focus" type="monotone" dataKey="avgFocus" name="Focus %" stroke="#2563eb" fill={theme === 'dark' ? '#1e3a8a44' : '#dbeafe'} connectNulls />
          </AreaChart>
        </ChartBox>
      </Card>

      <Card className="p-5">
        <SectionTitle sub="Meditatie minuten">Habits</SectionTitle>
        <ChartBox>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 10 }} />
            <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Bar dataKey="meditation" name="Min" fill="#16a34a" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartBox>
      </Card>

      <Card className="p-5">
        <SectionTitle sub="Rooster adherence">Timetable</SectionTitle>
        <ChartBox>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 10 }} />
            <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} width={32} domain={[0, 100]} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Line type="monotone" dataKey="timetable" name="TT %" stroke="#ca8a04" dot={false} strokeWidth={2} connectNulls />
          </LineChart>
        </ChartBox>
      </Card>
    </div>
  )
}
