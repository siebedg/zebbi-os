import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, DailyEntry, ReadingBook, WeightEntry } from '../types'
import { enrichEntry } from '../lib/sessions'
import { loadAllBundledMonths, loadSeedData, loadState, saveState } from '../lib/storage'
import {
  fetchRemoteState,
  pushRemoteState,
  PULL_INTERVAL_MS,
  type SyncStatus,
} from '../lib/sync'
import { mergeAppState } from '../lib/mergeState'
import { signalAuthLost } from '../lib/auth'
import { SEED_WEIGHT_LOG } from '../lib/seedWeight'
import { entryHasData, mergeByUpdatedAt, patchAllBundledMonths, todayISO, uid } from '../lib/utils'

const PUSH_DELAY_MS = 800

type Store = {
  ready: boolean
  state: AppState
  syncStatus: SyncStatus
  syncError?: string
  todayEntry?: DailyEntry
  filledEntries: DailyEntry[]
  upsertDaily: (entry: DailyEntry) => void
  getDailyByDate: (date: string) => DailyEntry | undefined
  importDaily: (entries: DailyEntry[]) => void
  deleteDaily: (date: string) => void
  saveReadingBook: (book: ReadingBook) => void
  deleteReadingBook: (id: string) => void
  upsertWeight: (entry: WeightEntry) => void
  deleteWeight: (date: string) => void
  refreshFromCloud: () => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

function withTimestamp(state: AppState): AppState {
  return { ...state, stateUpdatedAt: new Date().toISOString() }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | undefined>()
  const initDone = useRef(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyRemote = useCallback((remote: AppState, remoteSavedAt?: string | null) => {
    setState((prev) => {
      const merged = mergeAppState(prev, {
        ...remote,
        stateUpdatedAt: remoteSavedAt ?? remote.stateUpdatedAt,
      })
      saveState(merged)
      return merged
    })
  }, [])

  const schedulePush = useCallback((next: AppState) => {
    if (pushTimer.current) clearTimeout(pushTimer.current)
    setSyncStatus('syncing')
    pushTimer.current = setTimeout(async () => {
      const stamped = withTimestamp(next)
      const result = await pushRemoteState(stamped)
      if (result.error === 'auth') {
        setSyncStatus('auth')
        setSyncError('PIN vereist of onjuist')
        signalAuthLost()
      } else if (!result.ok) {
        setSyncStatus('offline')
        setSyncError(result.error ?? 'Cloud niet bereikbaar')
      } else {
        setSyncStatus('synced')
        setSyncError(undefined)
      }
    }, PUSH_DELAY_MS)
  }, [])

  const commit = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev)
        saveState(next)
        schedulePush(next)
        return next
      })
    },
    [schedulePush],
  )

  const pullFromCloud = useCallback(async () => {
    const { state: remote, status, error, storage } = await fetchRemoteState()
    if (status === 401) {
      setSyncStatus('auth')
      setSyncError('PIN vereist')
      signalAuthLost()
      return
    }
    if (!remote) {
      if (storage === 'none' && status === 200) {
        setSyncStatus('offline')
        setSyncError('Geen cloud storage — koppel Redis in Vercel')
      } else if (error) {
        setSyncStatus('offline')
        setSyncError(error)
      }
      return
    }
    applyRemote(remote, remote.stateUpdatedAt)
    setSyncStatus('synced')
    setSyncError(undefined)
  }, [applyRemote])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const local = loadState()
      const [bundled, remoteResult] = await Promise.all([loadAllBundledMonths(), fetchRemoteState()])

      if (remoteResult.status === 401) {
        if (!cancelled) signalAuthLost()
        return
      }

      let base: AppState = { dailyLog: [], readingBooks: [], weightLog: [] }

      if (remoteResult.state && remoteResult.state.dailyLog.length > 0) {
        base = remoteResult.state
      } else if (local.dailyLog.length > 0) {
        base = local
      } else {
        base = { ...base, dailyLog: await loadSeedData() }
      }

      let log = patchAllBundledMonths(base.dailyLog, bundled)
      log = mergeByUpdatedAt(log, local.dailyLog)
      if (remoteResult.state) {
        log = mergeByUpdatedAt(log, remoteResult.state.dailyLog)
      }

      let weightLog = mergeAppState(
        { dailyLog: [], readingBooks: [], weightLog: local.weightLog ?? [] },
        remoteResult.state ?? {},
      ).weightLog ?? []
      if (weightLog.length === 0) weightLog = SEED_WEIGHT_LOG

      const merged = mergeAppState(
        { dailyLog: log, readingBooks: [], weightLog },
        mergeAppState(remoteResult.state ?? { dailyLog: [], readingBooks: [], weightLog: [] }, local),
      )

      if (!cancelled) {
        setState(merged)
        saveState(merged)
        initDone.current = true
        setReady(true)

        setSyncStatus('syncing')
        const result = await pushRemoteState(withTimestamp(merged))
        if (!cancelled) {
          if (result.error === 'auth') {
            setSyncStatus('auth')
            setSyncError('PIN vereist')
            signalAuthLost()
          } else if (!result.ok) {
            setSyncStatus('offline')
            setSyncError(result.error ?? 'Opslaan mislukt — storage niet gekoppeld?')
          } else {
            setSyncStatus('synced')
          }
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!ready || !initDone.current) return
    const id = setInterval(() => {
      void pullFromCloud()
    }, PULL_INTERVAL_MS)
    const onFocus = () => void pullFromCloud()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [ready, pullFromCloud])

  const upsertDaily = useCallback(
    (entry: DailyEntry) => {
      const enriched = enrichEntry({ ...entry, updatedAt: new Date().toISOString() })
      commit((prev) => ({
        ...prev,
        dailyLog: [...prev.dailyLog.filter((e) => e.date !== enriched.date), enriched].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      }))
    },
    [commit],
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
      commit((prev) => ({
        ...prev,
        dailyLog: mergeByUpdatedAt(prev.dailyLog, stamped),
      }))
    },
    [commit],
  )

  const deleteDaily = useCallback(
    (date: string) => {
      commit((prev) => ({
        ...prev,
        dailyLog: prev.dailyLog.filter((e) => e.date !== date),
      }))
    },
    [commit],
  )

  const saveReadingBook = useCallback(
    (book: ReadingBook) => {
      const stamped = { ...book, updatedAt: new Date().toISOString() }
      commit((prev) => ({
        ...prev,
        readingBooks: [...(prev.readingBooks ?? []).filter((b) => b.id !== stamped.id), stamped],
      }))
    },
    [commit],
  )

  const deleteReadingBook = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        readingBooks: (prev.readingBooks ?? []).filter((b) => b.id !== id),
      }))
    },
    [commit],
  )

  const upsertWeight = useCallback(
    (entry: WeightEntry) => {
      const stamped = { ...entry, updatedAt: new Date().toISOString() }
      commit((prev) => ({
        ...prev,
        weightLog: [...(prev.weightLog ?? []).filter((w) => w.date !== stamped.date), stamped].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      }))
    },
    [commit],
  )

  const deleteWeight = useCallback(
    (date: string) => {
      commit((prev) => ({
        ...prev,
        weightLog: (prev.weightLog ?? []).filter((w) => w.date !== date),
      }))
    },
    [commit],
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
      syncError,
      todayEntry,
      filledEntries,
      upsertDaily,
      getDailyByDate,
      importDaily,
      deleteDaily,
      saveReadingBook,
      deleteReadingBook,
      upsertWeight,
      deleteWeight,
      refreshFromCloud: pullFromCloud,
    }),
    [
      ready,
      state,
      syncStatus,
      syncError,
      todayEntry,
      filledEntries,
      upsertDaily,
      getDailyByDate,
      importDaily,
      deleteDaily,
      saveReadingBook,
      deleteReadingBook,
      upsertWeight,
      deleteWeight,
      pullFromCloud,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export { uid }
