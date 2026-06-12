import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, DailyEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import { loadAllBundledMonths, loadSeedData, loadState, saveState } from '../lib/storage'
import { fetchRemoteState, pushRemoteState, type SyncStatus } from '../lib/sync'
import { entryHasData, mergeByUpdatedAt, patchAllBundledMonths, todayISO } from '../lib/utils'

const PUSH_DELAY_MS = 800

type Store = {
  ready: boolean
  state: AppState
  syncStatus: SyncStatus
  todayEntry?: DailyEntry
  filledEntries: DailyEntry[]
  upsertDaily: (entry: DailyEntry) => void
  getDailyByDate: (date: string) => DailyEntry | undefined
  importDaily: (entries: DailyEntry[]) => void
  deleteDaily: (date: string) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const initDone = useRef(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedulePush = useCallback((next: AppState) => {
    if (pushTimer.current) clearTimeout(pushTimer.current)
    setSyncStatus('syncing')
    pushTimer.current = setTimeout(async () => {
      const ok = await pushRemoteState(next)
      setSyncStatus(ok ? 'synced' : 'offline')
    }, PUSH_DELAY_MS)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const local = loadState()
      let log = local.dailyLog

      if (log.length === 0) {
        log = await loadSeedData()
      }

      const [bundled, remote] = await Promise.all([loadAllBundledMonths(), fetchRemoteState()])

      log = patchAllBundledMonths(log, bundled)
      log = mergeByUpdatedAt(log, local.dailyLog)
      if (remote?.dailyLog?.length) {
        log = mergeByUpdatedAt(log, remote.dailyLog)
      }

      if (!cancelled) {
        const next = { dailyLog: log }
        setState(next)
        saveState(next)
        initDone.current = true
        setReady(true)

        setSyncStatus('syncing')
        const ok = await pushRemoteState(next)
        if (!cancelled) setSyncStatus(ok ? 'synced' : 'offline')
      }
    }

    init()
    return () => {
      cancelled = true
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [])

  useEffect(() => {
    if (ready && initDone.current) saveState(state)
  }, [state, ready])

  const upsertDaily = useCallback(
    (entry: DailyEntry) => {
      const enriched = enrichEntry({ ...entry, updatedAt: new Date().toISOString() })
      setState((prev) => {
        const next = {
          ...prev,
          dailyLog: [...prev.dailyLog.filter((e) => e.date !== enriched.date), enriched].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        }
        saveState(next)
        schedulePush(next)
        return next
      })
    },
    [schedulePush],
  )

  const getDailyByDate = useCallback(
    (date: string) => state.dailyLog.find((e) => e.date === date),
    [state.dailyLog],
  )

  const importDaily = useCallback(
    (entries: DailyEntry[]) => {
      const stamped = entries.map((e) =>
        enrichEntry({ ...e, updatedAt: e.updatedAt ?? new Date().toISOString() }),
      )
      setState((prev) => {
        const next = {
          ...prev,
          dailyLog: mergeByUpdatedAt(prev.dailyLog, stamped),
        }
        saveState(next)
        schedulePush(next)
        return next
      })
    },
    [schedulePush],
  )

  const deleteDaily = useCallback(
    (date: string) => {
      setState((prev) => {
        const next = { ...prev, dailyLog: prev.dailyLog.filter((e) => e.date !== date) }
        saveState(next)
        schedulePush(next)
        return next
      })
    },
    [schedulePush],
  )

  const todayEntry = useMemo(
    () => state.dailyLog.find((e) => e.date === todayISO()),
    [state.dailyLog],
  )

  const filledEntries = useMemo(
    () => state.dailyLog.filter(entryHasData),
    [state.dailyLog],
  )

  const value = useMemo(
    () => ({
      ready,
      state,
      syncStatus,
      todayEntry,
      filledEntries,
      upsertDaily,
      getDailyByDate,
      importDaily,
      deleteDaily,
    }),
    [
      ready,
      state,
      syncStatus,
      todayEntry,
      filledEntries,
      upsertDaily,
      getDailyByDate,
      importDaily,
      deleteDaily,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
