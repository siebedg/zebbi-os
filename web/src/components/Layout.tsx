import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, CalendarDays, LineChart, Moon, PenLine, Scale, Sun } from 'lucide-react'
import type { SyncStatus } from '../lib/sync'
import { useTheme } from '../hooks/useTheme'

const MAIN_TABS = [
  { path: '/', label: 'Vandaag', icon: PenLine, end: true },
  { path: '/maand', label: 'Maand', icon: CalendarDays, end: false },
  { path: '/trend', label: 'Trend', icon: LineChart, end: false },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3, end: false },
] as const

const EXTRA_TABS = [
  { path: '/lezen', label: 'Lezen', icon: BookOpen, end: false },
  { path: '/gewicht', label: 'Gewicht', icon: Scale, end: false },
] as const

type TabDef = (typeof MAIN_TABS)[number] | (typeof EXTRA_TABS)[number]

function navLinkClass({ isActive }: { isActive: boolean }, compact?: boolean) {
  return `flex items-center gap-2 border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition ${
    compact ? 'px-2.5' : 'px-3'
  } ${
    isActive
      ? 'border-[var(--color-text)] text-[var(--color-text)]'
      : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
  }`
}

function NavTab({ tab, compact }: { tab: TabDef; compact?: boolean }) {
  const Icon = tab.icon
  return (
    <NavLink key={tab.path} to={tab.path} end={tab.end} className={({ isActive }) => navLinkClass({ isActive }, compact)} title={tab.label}>
      <Icon className="h-4 w-4" />
      <span className={compact ? 'hidden sm:inline' : undefined}>{tab.label}</span>
    </NavLink>
  )
}

function SyncDot({ status, error }: { status: SyncStatus; error?: string }) {
  const title =
    error ??
    (status === 'synced'
      ? 'Opgeslagen in cloud'
      : status === 'syncing'
        ? 'Bezig met opslaan…'
        : status === 'auth'
          ? 'PIN vereist'
          : status === 'offline'
            ? 'Cloud niet bereikbaar'
            : 'Sync')
  const color =
    status === 'synced'
      ? 'bg-[var(--color-good)]'
      : status === 'syncing'
        ? 'bg-amber-400'
        : status === 'auth'
          ? 'bg-[var(--color-bad)]'
          : 'bg-[var(--color-muted)]'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]" title={title}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="hidden sm:inline max-w-[8rem] truncate">
        {status === 'offline' ? 'Offline' : status === 'auth' ? 'PIN' : status === 'synced' ? 'Sync' : '…'}
      </span>
    </span>
  )
}

export function Layout({
  syncStatus = 'idle',
  syncError,
  children,
}: {
  syncStatus?: SyncStatus
  syncError?: string
  children: React.ReactNode
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">Zebbi OS</h1>
          <div className="flex items-center gap-3">
            <SyncDot status={syncStatus} error={syncError} />
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
              title={theme === 'light' ? 'Donker thema' : 'Licht thema'}
              aria-label={theme === 'light' ? 'Schakel naar donker thema' : 'Schakel naar licht thema'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-stretch justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {MAIN_TABS.map((tab) => (
              <NavTab key={tab.path} tab={tab} />
            ))}
          </div>
          <div className="flex shrink-0 items-stretch gap-0.5 border-l border-[var(--color-border)] pl-2 sm:pl-3">
            {EXTRA_TABS.map((tab) => (
              <NavTab key={tab.path} tab={tab} compact />
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
