import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileText, Heart, Upload } from 'lucide-react'
import type { DailyEntry, DeepWorkSession } from '../types'
import { MAX_SESSIONS } from '../types'
import {
  parseMultiDayNotes,
  parseWorkBlocks,
  parsedDayToEntry,
  sessionsToNotesText,
} from '../lib/parseNotes'
import {
  computeWorkTotals,
  emptySession,
  enrichEntry,
  sessionDurationHours,
} from '../lib/sessions'
import { applyRestDay, isKnownRestDate, isRestDay, REST_STRIPE_BG } from '../lib/restDays'
import {
  computeSleepHours,
  entryHasData,
  formatDateNL,
  todayISO,
  uid,
} from '../lib/utils'
import { Card, SectionTitle, Input, Toggle, Btn, HabitChoice, TimeInput12 } from './ui'

function initialRestDay(entry?: DailyEntry, date?: string): boolean {
  if (!entry) return isKnownRestDate(date ?? todayISO())
  return isRestDay(entry)
}

function SleepField({
  label,
  hasValue,
  onClear,
  children,
}: {
  label: string
  hasValue: boolean
  onClear: () => void
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-[var(--color-bad)] hover:underline"
          >
            Wis
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ensureSessions(entry?: DailyEntry): DeepWorkSession[] {
  if (entry?.sessions?.length) return entry.sessions.map((s) => ({ ...s }))
  const fromLegacy: DeepWorkSession[] = []
  for (let i = 1; i <= MAX_SESSIONS; i++) {
    const hours = entry?.[`deepWork${i}` as keyof DailyEntry] as number | undefined
    if (hours != null && hours > 0) {
      fromLegacy.push({
        id: uid(),
        startTime: '',
        endTime: '',
        focusPercent: entry?.avgFocus ?? 75,
        durationHours: hours,
      })
    }
  }
  if (fromLegacy.length) return fromLegacy
  return [emptySession()]
}

export function DailyEntryForm({
  initial,
  bedTargetDate,
  onSave,
  onBulkSave,
  onDelete,
}: {
  initial?: DailyEntry
  bedTargetDate: string
  onSave: (entry: DailyEntry) => void
  onBulkSave?: (entries: DailyEntry[]) => void
  onDelete?: (date: string) => void
}) {
  const date = initial?.date ?? todayISO()
  const bedDateLabel = formatDateNL(bedTargetDate, 'EEE d MMM')
  const [wakeTime, setWakeTime] = useState(initial?.wakeTime ?? '')
  const [bedTime, setBedTime] = useState(initial?.bedTime ?? '')
  const [sleepScore, setSleepScore] = useState<number | ''>(
    initial?.sleepScore != null
      ? initial.sleepScore <= 1
        ? Math.round(initial.sleepScore * 100)
        : initial.sleepScore
      : '',
  )
  const [meditation, setMeditation] = useState<number | ''>(initial?.meditation ?? '')
  const [gratitude, setGratitude] = useState<boolean | undefined>(initial?.gratitude)
  const [exercise, setExercise] = useState<boolean | undefined>(initial?.exercise)
  const [sessions, setSessions] = useState<DeepWorkSession[]>(() => ensureSessions(initial))
  const [timetable, setTimetable] = useState<number | ''>(initial?.timetable ?? '')
  const [restDay, setRestDay] = useState(() => initialRestDay(initial, date))
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [saved, setSaved] = useState(false)
  const [parseMsg, setParseMsg] = useState<string | null>(null)

  useEffect(() => {
    setWakeTime(initial?.wakeTime ?? '')
    setBedTime(initial?.bedTime ?? '')
    setSleepScore(
      initial?.sleepScore != null
        ? initial.sleepScore <= 1
          ? Math.round(initial.sleepScore * 100)
          : initial.sleepScore
        : '',
    )
    setMeditation(initial?.meditation ?? '')
    setGratitude(initial?.gratitude)
    setExercise(initial?.exercise)
    setSessions(ensureSessions(initial))
    setTimetable(initial?.timetable ?? '')
    setRestDay(initialRestDay(initial, initial?.date ?? date))
    setPasteText('')
    setParseMsg(null)
  }, [initial, date])

  const setRestDayMode = (on: boolean) => {
    setRestDay(on)
    if (on) {
      setSessions([emptySession()])
      setTimetable('')
    }
    setSaved(false)
  }

  const totals = useMemo(
    () => computeWorkTotals(sessions.filter((s) => s.startTime && s.endTime)),
    [sessions],
  )

  const canDelete = Boolean(initial && entryHasData(initial) && onDelete)

  const updateSession = (id: string, patch: Partial<DeepWorkSession>) => {
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setSaved(false)
  }

  const addSession = () => {
    if (sessions.length >= MAX_SESSIONS) return
    setSessions((list) => [...list, emptySession()])
  }

  const removeSession = (id: string) => {
    setSessions((list) => (list.length <= 1 ? list : list.filter((s) => s.id !== id)))
  }

  const applyParsed = () => {
    const text = pasteText.trim()
    if (!text) return

    const multi = parseMultiDayNotes(text)
    if (multi.length > 1 && onBulkSave) {
      const entries = multi.filter((d) => d.date).map((d) => parsedDayToEntry(d, d.date!))
      onBulkSave(entries)
      setParseMsg(`${entries.length} dagen ingevuld`)
      setShowPaste(false)
      return
    }

    const workBlocks = parseWorkBlocks(text)
    if (workBlocks.length > 0) {
      setRestDay(false)
      setSessions(workBlocks.slice(0, MAX_SESSIONS).map((s) => ({ ...s, id: uid() })))
      setParseMsg(`${workBlocks.length} deep work blok(ken) → DW1–DW${workBlocks.length}`)
      setShowPaste(false)
      return
    }

    const parsed = multi.length > 0 ? multi.find((d) => d.date === date) ?? multi[0] : null
    if (parsed) {
      if (parsed.wakeTime) setWakeTime(parsed.wakeTime)
      if (parsed.bedTime) setBedTime(parsed.bedTime)
      if (parsed.sleepScore != null)
        setSleepScore(
          parsed.sleepScore <= 1 ? Math.round(parsed.sleepScore * 100) : parsed.sleepScore,
        )
      if (parsed.meditation != null) setMeditation(parsed.meditation)
      if (parsed.gratitude != null) setGratitude(parsed.gratitude)
      if (parsed.exercise != null) setExercise(parsed.exercise)
      if (parsed.dayType === 'rest') {
        setRestDayMode(true)
        setParseMsg('Rustdag herkend')
        setShowPaste(false)
        return
      }
      if (parsed.timetable != null) setTimetable(parsed.timetable)
      if (parsed.sessions.length > 0) {
        setSessions(parsed.sessions.slice(0, MAX_SESSIONS).map((s) => ({ ...s, id: uid() })))
        setParseMsg(`${parsed.sessions.length} deep work sessie(s) herkend`)
        setShowPaste(false)
        return
      }
    }

    setParseMsg('Geen blokken gevonden — gebruik tijdregels en lege regels tussen sessies')
    setShowPaste(false)
  }

  const buildEntry = (): DailyEntry => {
    const score =
      sleepScore === ''
        ? undefined
        : Number(sleepScore) > 1
          ? Number(sleepScore) / 100
          : Number(sleepScore) / 100

    const entry: DailyEntry = {
      date,
      wakeTime: wakeTime || undefined,
      bedTime: bedTime || undefined,
      sleepHours: computeSleepHours(wakeTime || undefined, bedTime || undefined),
      sleepScore: score,
      meditation: meditation !== '' ? Number(meditation) : undefined,
      ...(gratitude !== undefined ? { gratitude } : {}),
      ...(exercise !== undefined ? { exercise } : {}),
      dayType: restDay ? 'rest' : 'normal',
    }

    if (restDay) return enrichEntry(applyRestDay(entry))

    return enrichEntry({
      ...entry,
      sessions: sessions.filter((s) => s.startTime && s.endTime),
      timetable: timetable !== '' ? Number(timetable) : undefined,
    })
  }

  const handleSave = () => {
    onSave(buildEntry())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = () => {
    if (!onDelete || !canDelete) return
    if (!window.confirm(`Log voor ${formatDateNL(date)} verwijderen?`)) return
    onDelete(date)
  }

  const clearSleepField = (field: 'wake' | 'bed' | 'score') => {
    if (field === 'wake') setWakeTime('')
    if (field === 'bed') setBedTime('')
    if (field === 'score') setSleepScore('')
    setSaved(false)
  }

  const clearAllSleep = () => {
    setWakeTime('')
    setBedTime('')
    setSleepScore('')
    setSaved(false)
  }

  const hasAnySleep = Boolean(wakeTime || bedTime || sleepScore !== '')

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle sub={formatDateNL(date, 'EEEE d MMMM yyyy')}>
            Dagelijkse log
          </SectionTitle>
          <Btn variant="ghost" onClick={() => setShowPaste(!showPaste)} className="!py-2 !text-xs">
            <FileText className="h-3.5 w-3.5" />
            Plak .txt notities
          </Btn>
        </div>

        {showPaste && (
          <div className="mt-4 space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4">
            <p className="text-sm text-[var(--color-muted)]">
              Elk blok = één deep work (DW1, DW2, …). Formaat per blok:{' '}
              <code>8:00 --&gt; 9:30</code> en <code>85%</code>, gescheiden door een lege regel.
            </p>
            <textarea
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
              rows={8}
              placeholder={`8:00 --> 9:30\n85%\n\n\n10:43 --> 11:43\n55%`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Btn onClick={applyParsed} className="!py-2 !text-xs">
              <Upload className="h-3.5 w-3.5" /> Invullen
            </Btn>
            {parseMsg && <p className="text-xs text-[var(--color-good)]">{parseMsg}</p>}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-[var(--color-text)]">Slaap</h3>
            {hasAnySleep && (
              <button
                type="button"
                onClick={clearAllSleep}
                className="text-xs text-[var(--color-bad)] hover:underline"
              >
                Wis alles
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-[var(--color-muted)]">
            Whoop-stijl: wake van vandaag, bedtijd van {bedDateLabel} (avond).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <SleepField label="Wake (vandaag)" hasValue={Boolean(wakeTime)} onClear={() => clearSleepField('wake')}>
              <TimeInput12 value={wakeTime} onChange={setWakeTime} />
            </SleepField>
            <SleepField
              label={`Bed (${bedDateLabel})`}
              hasValue={Boolean(bedTime)}
              onClear={() => clearSleepField('bed')}
            >
              <TimeInput12 value={bedTime} onChange={setBedTime} />
            </SleepField>
            <SleepField
              label="Sc%"
              hasValue={sleepScore !== ''}
              onClear={() => clearSleepField('score')}
            >
              <input
                type="number"
                min="0"
                max="100"
                value={sleepScore}
                onChange={(e) => setSleepScore(e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
            </SleepField>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text)]">Habits</h3>
          <div className="space-y-2">
            <Toggle
              label="Rustdag (geen werk / timetable)"
              checked={restDay}
              onChange={setRestDayMode}
            />
            <Input
              label="Meditation (min)"
              type="number"
              min="0"
              value={meditation}
              onChange={(e) => setMeditation(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <HabitChoice label="Gratitude journal" value={gratitude} onChange={setGratitude} />
            <HabitChoice label="Exercise" value={exercise} onChange={setExercise} />
          </div>
        </Card>
      </div>

      <Card className={`p-4 sm:p-5 ${restDay ? 'opacity-90' : ''}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text)]">Deep work sessions</h3>
          {!restDay && sessions.length < MAX_SESSIONS && (
            <button
              type="button"
              onClick={addSession}
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              + sessie
            </button>
          )}
        </div>

        {restDay ? (
          <div className="space-y-2">
            <div className="h-3 rounded-full" style={{ background: REST_STRIPE_BG }} />
            <p className="text-sm text-[var(--color-muted)]">
              Rustdag — deep work en timetable zijn uitgeschakeld.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text)]">Deep work {i + 1}</span>
                  <span className="text-xs tabular-nums text-[var(--color-muted)]">
                    {s.startTime && s.endTime
                      ? `${sessionDurationHours(s).toFixed(2)}u`
                      : s.durationHours != null
                        ? `${s.durationHours.toFixed(2)}u`
                        : '—'}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Start</span>
                    <TimeInput12
                      value={s.startTime}
                      onChange={(v) => updateSession(s.id, { startTime: v })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">Einde</span>
                    <TimeInput12
                      value={s.endTime}
                      onChange={(v) => updateSession(s.id, { endTime: v })}
                    />
                  </label>
                  <Input
                    label="Focus %"
                    type="number"
                    min="0"
                    max="100"
                    value={s.focusPercent}
                    onChange={(e) =>
                      updateSession(s.id, { focusPercent: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSession(s.id)}
                    className="mt-2 text-xs text-[var(--color-bad)] hover:underline"
                  >
                    Verwijder
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!restDay && (
          <div className="mt-4 grid gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-[var(--color-muted)]">Total deep work</span>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{totals.totalHoursWorked}u</p>
            </div>
            <div>
              <span className="text-[var(--color-muted)]">Avg focus</span>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{totals.avgFocus ?? '—'}%</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        {restDay ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">Timetable score %</p>
            <div className="h-3 rounded-full" style={{ background: REST_STRIPE_BG }} />
            <p className="text-xs text-[var(--color-muted)]">Niet van toepassing op rustdagen</p>
          </div>
        ) : (
          <Input
            label="Timetable score %"
            type="number"
            min="0"
            max="100"
            value={timetable}
            onChange={(e) => setTimetable(e.target.value ? parseFloat(e.target.value) : '')}
          />
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Btn onClick={handleSave} className="w-full sm:w-auto">
            Opslaan
          </Btn>
          {canDelete && (
            <Btn variant="danger" onClick={handleDelete} className="w-full sm:w-auto">
              Verwijder dag
            </Btn>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-sm text-[var(--color-good)]">
              <Heart className="h-4 w-4" /> Opgeslagen
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}

export { sessionsToNotesText }
