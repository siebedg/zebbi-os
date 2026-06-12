import { useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  addMonths,
  subMonths,
  getDate,
  getDay,
  isAfter,
  isBefore,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { enrichEntry } from '../lib/sessions'
import { isValidDateStr } from '../lib/utils'
import {
  DEEP_WORK_FIELDS,
  MONTH_VIEW_COLUMNS,
  getRestStyle,
  formatFieldValue,
  getCellStyle,
  getEntryField,
  getVacationZone,
  isVacationDay,
} from '../lib/colors'
import {
  REST_STRIPE_BG,
  REST_WORK_FIELD_SET,
  REST_WORK_FIELDS,
  isRestDay,
} from '../lib/restDays'
import { Card, SectionTitle } from './ui'

const DOW = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z']

/** Eerste zichtbare maand (nov 2025 en eerder verborgen) */
const FIRST_VISIBLE_MONTH = startOfMonth(new Date(2025, 11, 1))

function clampVisibleMonth(d: Date): Date {
  const m = startOfMonth(d)
  return isBefore(m, FIRST_VISIBLE_MONTH) ? FIRST_VISIBLE_MONTH : m
}

export function MonthView({
  entries,
  onSelectDate,
}: {
  entries: DailyEntry[]
  onSelectDate?: (date: string) => void
}) {
  const [cursor, setCursor] = useState(() => clampVisibleMonth(new Date()))
  const { theme } = useTheme()

  const canGoPrev = isAfter(cursor, FIRST_VISIBLE_MONTH)
  const isMayMemorial = cursor.getMonth() === 4
  const memorialCellOpacity = isMayMemorial ? 0.38 : 1

  const entryMap = useMemo(
    () =>
      new Map(
        entries.filter((e) => isValidDateStr(e.date)).map((e) => [e.date, enrichEntry(e)]),
      ),
    [entries],
  )

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'))
  }, [cursor])

  const monthLabel = format(cursor, 'MMMM yyyy', { locale: nl })
  const rowH = `calc((100vh - 260px) / ${monthDays.length})`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub={`${monthDays.length} dagen`}>{monthLabel}</SectionTitle>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => canGoPrev && setCursor((c) => clampVisibleMonth(subMonths(c, 1)))}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(clampVisibleMonth(new Date()))}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs hover:bg-[var(--color-surface-overlay)]"
          >
            Nu
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 hover:bg-[var(--color-surface-overlay)]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Card
        className={`relative overflow-x-auto p-0 ${isMayMemorial ? 'bg-[var(--color-surface)]' : ''}`}
      >
        {isMayMemorial && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 55% 45% at 50% 52%, color-mix(in srgb, var(--color-muted) 7%, transparent), transparent 72%)',
              }}
            />
            <span
              className="relative select-none font-serif italic tracking-[0.55em] text-[var(--color-muted)]"
              style={{
                fontSize: 'clamp(2.75rem, 7vw, 4.25rem)',
                fontWeight: 300,
                opacity: 0.15,
                textShadow: '0 1px 28px color-mix(in srgb, var(--color-muted) 25%, transparent)',
              }}
            >
              RIP
            </span>
          </div>
        )}
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-[10px] leading-tight">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] text-left text-[var(--color-muted)]">
              <th className="w-8 border-r border-[var(--color-border)] px-1 py-2 font-medium">#</th>
              <th className="w-6 border-r border-[var(--color-border)] px-1 py-2 font-medium">D</th>
              {MONTH_VIEW_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-1 py-2 font-medium"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthDays.map((dateStr) => {
              void theme
              const entry = entryMap.get(dateStr) ?? { date: dateStr }
              const d = parseISO(dateStr)
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
              const isVacation = isVacationDay(entry)
              const isRest = isRestDay(entry)
              const specialStyle =
                isRest || entry.dayType === 'travel' ? getRestStyle() : null

              return (
                <tr
                  key={dateStr}
                  style={{ height: rowH, maxHeight: rowH }}
                  onClick={() => onSelectDate?.(dateStr)}
                  className={`border-b border-[var(--color-border)] ${
                    onSelectDate ? 'cursor-pointer hover:bg-[var(--color-surface-overlay)]' : ''
                  } ${isToday ? 'bg-[var(--color-accent-soft)]' : ''}`}
                >
                  <td
                    className="border-r border-[var(--color-border)] text-center font-mono text-[var(--color-text)]"
                    style={{
                      background: specialStyle?.bg,
                      opacity: isMayMemorial ? memorialCellOpacity : 1,
                    }}
                  >
                    {getDate(d)}
                  </td>
                  <td
                    className="border-r border-[var(--color-border)] text-center text-[var(--color-muted)]"
                    style={{
                      background: specialStyle?.bg,
                      opacity: isMayMemorial ? memorialCellOpacity : 1,
                    }}
                  >
                    {DOW[getDay(d)]}
                  </td>
                  {MONTH_VIEW_COLUMNS.flatMap((col) => {
                    if (isRest && REST_WORK_FIELD_SET.has(col.key) && col.key !== 'deepWork1') {
                      return []
                    }
                    if (isRest && col.key === 'deepWork1') {
                      return [
                        <td
                          key="rest-work-stripe"
                          colSpan={REST_WORK_FIELDS.length}
                          className="p-0"
                        >
                          <div
                            className="h-full min-h-[16px] rounded-none"
                            style={{
                              background: REST_STRIPE_BG,
                              opacity: memorialCellOpacity,
                            }}
                            title="Rustdag"
                          />
                        </td>,
                      ]
                    }

                    const val = getEntryField(entry, col.key)
                    const style = getCellStyle(col.key, val, entry)
                    const display = formatFieldValue(col.key, val, entry)
                    const zone = isVacation ? getVacationZone(col.key) : null
                    const flushBand = zone || DEEP_WORK_FIELDS.has(col.key)
                    return (
                      <td key={col.key} className={flushBand ? 'p-0' : 'p-px'}>
                        <div
                          className={`flex h-full min-h-[16px] items-center justify-center font-medium tabular-nums ${
                            flushBand ? 'rounded-none' : 'rounded'
                          }`}
                          style={{
                            background: style.bg,
                            color: style.text,
                            opacity: memorialCellOpacity,
                          }}
                          title={display ? `${col.label}: ${display}` : col.label}
                        >
                          {display}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
