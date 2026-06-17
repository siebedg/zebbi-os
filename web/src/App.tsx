import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { StoreProvider, useStore } from './hooks/useStore'
import { Layout } from './components/Layout'
import { DailyEntryForm } from './components/DailyEntry'
import { MonthView } from './components/MonthView'
import { Charts } from './components/Charts'
import { TrendView } from './components/TrendView'
import { ReadingView } from './components/ReadingView'
import { WeightView } from './components/WeightView'
import { AuthGate } from './components/AuthGate'
import {
  bedTimeForForm,
  prepareWhoopSleepSave,
  prevDateISO,
  todayISO,
} from './lib/utils'

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
      Laden…
    </div>
  )
}

function EntryPage() {
  const { date: paramDate } = useParams()
  const navigate = useNavigate()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const { todayEntry, upsertDaily, getDailyByDate, deleteDaily } = useStore()

  const editDate = paramDate ?? null
  const wakeDate = editDate ?? todayEntry?.date ?? todayISO()
  const wakeEntry = editDate ? getDailyByDate(editDate) : todayEntry
  /** Bed op vorige kalenderdag in maand; ingevuld op wake-dag (12 jun entry → 11 jun Sleep) */
  const bedTargetDate = prevDateISO(wakeDate)
  const entryForEdit = wakeEntry
    ? {
        ...wakeEntry,
        bedTime: bedTimeForForm(bedTargetDate, getDailyByDate),
      }
    : editDate
      ? { date: editDate, bedTime: bedTimeForForm(bedTargetDate, getDailyByDate) }
      : undefined

  return (
    <>
      <DailyEntryForm
        key={entryForEdit?.date ?? editDate ?? 'today'}
        initial={entryForEdit}
        bedTargetDate={bedTargetDate}
        onSave={(e) => {
          const { upserts, deleteDates } = prepareWhoopSleepSave(e, bedTargetDate, getDailyByDate)
          for (const row of upserts) upsertDaily(row)
          for (const d of deleteDates) deleteDaily(d)
          navigate(editDate ? '/maand' : '/')
        }}
        onDelete={(d) => {
          deleteDaily(d)
          navigate('/maand')
        }}
        onBulkSave={(entries) => {
          for (const e of entries) upsertDaily(e)
          setSaveMsg(`${entries.length} dagen opgeslagen uit notities`)
          setTimeout(() => setSaveMsg(null), 4000)
        }}
      />
      {saveMsg && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] shadow-lg">
          {saveMsg}
        </div>
      )}
    </>
  )
}

function MonthPage({ entries }: { entries: import('./types').DailyEntry[] }) {
  const navigate = useNavigate()
  return (
    <MonthView
      entries={entries}
      onSelectDate={(date) => navigate(`/dag/${date}`)}
    />
  )
}

function AppShell() {
  const { ready, state, syncStatus, syncError, saveReadingBook, deleteReadingBook, upsertWeight, deleteWeight } =
    useStore()

  if (!ready) return <Loading />

  return (
    <Layout syncStatus={syncStatus} syncError={syncError}>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/dag/:date" element={<EntryPage />} />
        <Route path="/maand" element={<MonthPage entries={state.dailyLog} />} />
        <Route path="/grafieken" element={<Charts entries={state.dailyLog} />} />
        <Route path="/trend" element={<TrendView entries={state.dailyLog} />} />
        <Route
          path="/lezen"
          element={
            <ReadingView
              books={state.readingBooks ?? []}
              onSave={saveReadingBook}
              onDelete={deleteReadingBook}
            />
          }
        />
        <Route
          path="/gewicht"
          element={
            <WeightView
              entries={state.weightLog ?? []}
              onUpsert={upsertWeight}
              onDelete={deleteWeight}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <StoreProvider>
          <AppShell />
        </StoreProvider>
      </AuthGate>
    </BrowserRouter>
  )
}
