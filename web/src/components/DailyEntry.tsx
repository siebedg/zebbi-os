import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Check,
  FileText,
  Moon,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
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
import { Btn, HabitChoice, Input, TimeInput12, Toggle } from './ui'
import { FieldVisibilityPanel } from './FieldVisibilityPanel'
import { useFieldVisibility } from '../hooks/useFieldVisibility'

function initialRestDay(entry?: DailyEntry, date?: string): boolean {
  if (!entry) return isKnownRestDate(date ?? todayISO())
  return isRestDay(entry)
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

function Section({
  title,
  action,
  children,
  muted,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section className={`space-y-4 ${muted ? 'opacity-80' : ''}`}>
      <div className="flex items-end justify-between gap-3 border-b border-[var(--color-border)] pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function FieldClear({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-bad)]"
      aria-label="Wis"
    >
      Wis
    </button>
  )
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
        {hasValue && <FieldClear onClear={onClear} />}
      </div>
      {children}
    </div>
  )
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
  const isToday = date === todayISO()
  const { visibility } = useFieldVisibility()
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

  const hasAnySleep = Boolean(
    (visibility.wakeTime && wakeTime) ||
      (visibility.bedTime && bedTime) ||
      (visibility.sleepScore && sleepScore !== ''),
  )
  const showSleepCard =
    visibility.wakeTime || visibility.bedTime || visibility.sleepScore || visibility.sleepHours

  const sleepHoursPreview = computeSleepHours(wakeTime || undefined, bedTime || undefined)

  const inputClass =
    'w-full min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none transition focus:border-[var(--color-text)] focus:ring-0 sm:min-h-0 sm:py-2 sm:text-sm'

  return (
    <div className="mx-auto max-w-2xl pb-28">
      {/* Header */}
      <header className="mb-8 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {isToday ? 'Vandaag' : 'Daglog'}
            </p>
            <h1 className="mt-1 font-serif text-3xl tracking-tight text-[var(--color-text)] sm:text-4xl">
              {formatDateNL(date, 'EEEE')}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {formatDateNL(date, 'd MMMM yyyy')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {restDay && (
              <span className="rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted)]">
                Rustdag
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                showPaste
                  ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-text)] hover:text-[var(--color-text)]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Notities
            </button>
          </div>
        </div>

        {showPaste && (
          <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Elk blok = één deep work. Formaat:{' '}
              <code className="text-[var(--color-text)]">8:00 --&gt; 9:30</code> en{' '}
              <code className="text-[var(--color-text)]">85%</code>, gescheiden door een lege regel.
            </p>
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={7}
              placeholder={`8:00 --> 9:30\n85%\n\n\n10:43 --> 11:43\n55%`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Btn onClick={applyParsed} className="!py-2 !text-xs">
                <Upload className="h-3.5 w-3.5" /> Invullen
              </Btn>
              {parseMsg && <p className="text-xs text-[var(--color-good)]">{parseMsg}</p>}
            </div>
          </div>
        )}

        <FieldVisibilityPanel />
      </header>

      <div className="space-y-10">
        {/* Sleep */}
        {showSleepCard && (
          <Section
            title="Slaap"
            action={
              hasAnySleep ? (
                <button
                  type="button"
                  onClick={clearAllSleep}
                  className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-bad)]"
                >
                  Wis alles
                </button>
              ) : undefined
            }
          >
            {(visibility.wakeTime || visibility.bedTime) && (
              <p className="flex items-start gap-2 text-xs text-[var(--color-muted)]">
                <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Wake vandaag · bedtijd {bedDateLabel}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {visibility.wakeTime && (
                <SleepField
                  label="Wake"
                  hasValue={Boolean(wakeTime)}
                  onClear={() => clearSleepField('wake')}
                >
                  <TimeInput12 value={wakeTime} onChange={setWakeTime} className={inputClass} />
                </SleepField>
              )}
              {visibility.bedTime && (
                <SleepField
                  label={`Bed · ${bedDateLabel}`}
                  hasValue={Boolean(bedTime)}
                  onClear={() => clearSleepField('bed')}
                >
                  <TimeInput12 value={bedTime} onChange={setBedTime} className={inputClass} />
                </SleepField>
              )}
              {visibility.sleepScore && (
                <SleepField
                  label="Sleep score %"
                  hasValue={sleepScore !== ''}
                  onClear={() => clearSleepField('score')}
                >
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sleepScore}
                    onChange={(e) =>
                      setSleepScore(e.target.value ? parseFloat(e.target.value) : '')
                    }
                    className={inputClass}
                  />
                </SleepField>
              )}
            </div>
            {visibility.sleepHours && sleepHoursPreview != null && (
              <p className="text-sm tabular-nums text-[var(--color-text)]">
                <span className="text-[var(--color-muted)]">Berekend · </span>
                {sleepHoursPreview.toFixed(2)}u slaap
              </p>
            )}
          </Section>
        )}

        {/* Habits */}
        <Section title="Habits">
          <div className="space-y-3">
            <Toggle
              label="Rustdag (geen werk / timetable)"
              checked={restDay}
              onChange={setRestDayMode}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Meditation (min)"
                type="number"
                min="0"
                value={meditation}
                onChange={(e) => setMeditation(e.target.value ? parseFloat(e.target.value) : '')}
              />
              <div className="grid grid-cols-2 gap-3">
                {visibility.gratitude && (
                  <HabitChoice label="Gratitude" value={gratitude} onChange={setGratitude} />
                )}
                <HabitChoice label="Exercise" value={exercise} onChange={setExercise} />
              </div>
            </div>
          </div>
        </Section>

        {/* Deep work */}
        <Section
          title="Deep work"
          muted={restDay}
          action={
            !restDay && sessions.length < MAX_SESSIONS ? (
              <button
                type="button"
                onClick={addSession}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Sessie
              </button>
            ) : undefined
          }
        >
          {restDay ? (
            <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6">
              <div className="h-2.5 rounded-full" style={{ background: REST_STRIPE_BG }} />
              <p className="text-sm text-[var(--color-muted)]">
                Rustdag — deep work en timetable staan uit.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s, i) => {
                const hours =
                  s.startTime && s.endTime
                    ? sessionDurationHours(s)
                    : s.durationHours != null
                      ? s.durationHours
                      : null
                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-text)] text-xs font-semibold text-[var(--color-bg)]">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text)]">
                          Session {i + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums text-[var(--color-muted)]">
                          {hours != null ? `${hours.toFixed(2)}u` : '—'}
                        </span>
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSession(s.id)}
                            className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-bad)]"
                            aria-label="Verwijder sessie"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-[var(--color-muted)]">Start</span>
                        <TimeInput12
                          value={s.startTime}
                          onChange={(v) => updateSession(s.id, { startTime: v })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-[var(--color-muted)]">Einde</span>
                        <TimeInput12
                          value={s.endTime}
                          onChange={(v) => updateSession(s.id, { endTime: v })}
                          className={inputClass}
                        />
                      </label>
                      <Input
                        label="Focus %"
                        type="number"
                        min="0"
                        max="100"
                        value={s.focusPercent}
                        onChange={(e) =>
                          updateSession(s.id, {
                            focusPercent: parseInt(e.target.value, 10) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                )
              })}

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--color-surface-overlay)] px-4 py-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                    Totaal
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--color-text)]">
                    {totals.totalHoursWorked}
                    <span className="text-sm font-normal text-[var(--color-muted)]">u</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                    Avg focus
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[var(--color-text)]">
                    {totals.avgFocus ?? '—'}
                    {totals.avgFocus != null && (
                      <span className="text-sm font-normal text-[var(--color-muted)]">%</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Timetable */}
        <Section title="Timetable" muted={restDay}>
          {restDay ? (
            <div className="space-y-2">
              <div className="h-2.5 rounded-full" style={{ background: REST_STRIPE_BG }} />
              <p className="text-xs text-[var(--color-muted)]">Niet van toepassing op rustdagen</p>
            </div>
          ) : (
            <Input
              label="Score %"
              type="number"
              min="0"
              max="100"
              value={timetable}
              onChange={(e) => setTimetable(e.target.value ? parseFloat(e.target.value) : '')}
            />
          )}
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md md:left-[240px]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Btn onClick={handleSave} className="min-w-[8rem] flex-1 sm:flex-none">
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Opgeslagen
              </>
            ) : (
              'Opslaan'
            )}
          </Btn>
          {canDelete && (
            <Btn variant="danger" onClick={handleDelete} className="!px-3" aria-label="Verwijder dag">
              <Trash2 className="h-4 w-4" />
            </Btn>
          )}
          {saved && (
            <span className="hidden text-sm text-[var(--color-good)] sm:inline">Klaar</span>
          )}
        </div>
      </div>
    </div>
  )
}

export { sessionsToNotesText }
