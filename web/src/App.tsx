import { useState } from 'react'
import type { TabId } from './types'
import { useStore } from './hooks/useStore'
import { Layout } from './components/Layout'
import { DailyEntryForm } from './components/DailyEntry'
import { MonthView } from './components/MonthView'
import { Charts } from './components/Charts'

export default function App() {
  const [tab, setTab] = useState<TabId>('entry')
  const [editDate, setEditDate] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const { ready, state, todayEntry, upsertDaily, getDailyByDate, deleteDaily } = useStore()

  const entryForEdit = editDate ? getDailyByDate(editDate) : todayEntry

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">
        Laden…
      </div>
    )
  }

  return (
    <>
      <Layout active={tab} onTab={setTab}>
        {tab === 'entry' && (
          <DailyEntryForm
            key={entryForEdit?.date ?? editDate ?? 'today'}
            initial={entryForEdit ?? (editDate ? { date: editDate } : undefined)}
            onSave={(e) => {
              upsertDaily(e)
              setEditDate(null)
            }}
            onDelete={(d) => {
              deleteDaily(d)
              setEditDate(null)
            }}
            onBulkSave={(entries) => {
              for (const e of entries) upsertDaily(e)
              setSaveMsg(`${entries.length} dagen opgeslagen uit notities`)
              setTimeout(() => setSaveMsg(null), 4000)
            }}
          />
        )}
        {tab === 'timeline' && (
          <MonthView
            entries={state.dailyLog}
            onSelectDate={(date) => {
              setEditDate(date)
              setTab('entry')
            }}
          />
        )}
        {tab === 'charts' && <Charts entries={state.dailyLog} />}
      </Layout>

      {saveMsg && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] shadow-lg">
          {saveMsg}
        </div>
      )}
    </>
  )
}
