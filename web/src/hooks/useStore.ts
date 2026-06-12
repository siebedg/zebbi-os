import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, DailyEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import { loadAllBundledMonths, loadSeedData, loadState, saveState } from '../lib/storage'
import { entryHasData, mergeDailyEntries, patchAllBundledMonths, todayISO } from '../lib/utils'

const LOCAL_OVERRIDE_FROM = '2026-05-01'

export function useStore() {
  const [state, setState] = useState<AppState>(loadState)
  const [ready, setReady] = useState(false)
  const initDone = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const current = loadState()
      let log = current.dailyLog

      if (log.length === 0) {
        log = await loadSeedData()
      }

      const bundled = await loadAllBundledMonths()
      log = patchAllBundledMonths(log, bundled)

      // Lokale edits (mei+) hebben voorrang boven bundle
      const localRecent = current.dailyLog.filter(
        (e) => e.date >= LOCAL_OVERRIDE_FROM && entryHasData(e),
      )
      log = mergeDailyEntries(log, localRecent)

      if (!cancelled) {
        const next = { dailyLog: log }
        setState(next)
        saveState(next)
        initDone.current = true
        setReady(true)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (ready && initDone.current) saveState(state)
  }, [state, ready])

  const upsertDaily = useCallback((entry: DailyEntry) => {
    const enriched = enrichEntry(entry)
    setState((prev) => {
      const next = {
        ...prev,
        dailyLog: [...prev.dailyLog.filter((e) => e.date !== enriched.date), enriched].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      }
      saveState(next)
      return next
    })
  }, [])

  const getDailyByDate = useCallback(
    (date: string) => state.dailyLog.find((e) => e.date === date),
    [state.dailyLog],
  )

  const importDaily = useCallback((entries: DailyEntry[]) => {
    setState((prev) => {
      const next = {
        ...prev,
        dailyLog: mergeDailyEntries(prev.dailyLog, entries.map(enrichEntry)),
      }
      saveState(next)
      return next
    })
  }, [])

  const deleteDaily = useCallback((date: string) => {
    setState((prev) => {
      const next = { ...prev, dailyLog: prev.dailyLog.filter((e) => e.date !== date) }
      saveState(next)
      return next
    })
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
