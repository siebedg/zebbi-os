import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, DailyEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import {
  loadApril2026,
  loadDecember2025,
  loadFebruary2026,
  loadJanuary2026,
  loadMarch2026,
  loadSeedData,
  loadState,
  saveState,
} from '../lib/storage'
import {
  entryHasData,
  mergeDailyEntries,
  patchApril2026,
  patchDecember2025,
  patchFebruary2026,
  patchJanuary2026,
  patchMarch2026,
  todayISO,
} from '../lib/utils'

export function useStore() {
  const [state, setState] = useState<AppState>(loadState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const current = loadState()
      let next = { ...current }
      if (current.dailyLog.length === 0) {
        next = { ...next, dailyLog: await loadSeedData() }
      }
      const [december, january, february, march, april] = await Promise.all([
        loadDecember2025(),
        loadJanuary2026(),
        loadFebruary2026(),
        loadMarch2026(),
        loadApril2026(),
      ])
      let log = patchDecember2025(next.dailyLog, december)
      log = patchJanuary2026(log, january)
      log = patchFebruary2026(log, february)
      log = patchMarch2026(log, march)
      log = patchApril2026(log, april)
      next = { ...next, dailyLog: log }
      setState(next)
      saveState(next)
      setReady(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  const upsertDaily = useCallback((entry: DailyEntry) => {
    const enriched = enrichEntry(entry)
    setState((prev) => {
      const rest = prev.dailyLog.filter((e) => e.date !== enriched.date)
      return { ...prev, dailyLog: [...rest, enriched].sort((a, b) => a.date.localeCompare(b.date)) }
    })
  }, [])

  const getDailyByDate = useCallback(
    (date: string) => state.dailyLog.find((e) => e.date === date),
    [state.dailyLog],
  )

  const importDaily = useCallback((entries: DailyEntry[]) => {
    setState((prev) => ({
      ...prev,
      dailyLog: mergeDailyEntries(prev.dailyLog, entries.map(enrichEntry)),
    }))
  }, [])

  const deleteDaily = useCallback((date: string) => {
    setState((prev) => ({
      ...prev,
      dailyLog: prev.dailyLog.filter((e) => e.date !== date),
    }))
  }, [])

  const todayEntry = useMemo(
    () => state.dailyLog.find((e) => e.date === todayISO()),
    [state.dailyLog],
  )

  const filledEntries = useMemo(
    () => state.dailyLog.filter(entryHasData),
    [state.dailyLog],
  )

  return {
    ready,
    state,
    todayEntry,
    filledEntries,
    upsertDaily,
    getDailyByDate,
    importDaily,
    deleteDaily,
  }
}
