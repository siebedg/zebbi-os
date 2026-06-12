import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { StoreProvider, useStore } from './hooks/useStore'
import { Layout } from './components/Layout'
import { DailyEntryForm } from './components/DailyEntry'
import { MonthView } from './components/MonthView'
import { Charts } from './components/Charts'
import { TrendView } from './components/TrendView'

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
  const entryForEdit = editDate ? getDailyByDate(editDate) : todayEntry

  return (
    <>
      <DailyEntryForm
        key={entryForEdit?.date ?? editDate ?? 'today'}
        initial={entryForEdit ?? (editDate ? { date: editDate } : undefined)}
        onSave={(e) => {
          upsertDaily(e)
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
  const { ready, state, syncStatus } = useStore()

  if (!ready) return <Loading />

  return (
    <Layout syncStatus={syncStatus}>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/dag/:date" element={<EntryPage />} />
        <Route path="/maand" element={<MonthPage entries={state.dailyLog} />} />
        <Route path="/grafieken" element={<Charts entries={state.dailyLog} />} />
        <Route path="/trend" element={<TrendView entries={state.dailyLog} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </BrowserRouter>
  )
}
