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

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md border-b-2 px-2 py-1.5 text-xs font-medium transition md:min-h-0 md:min-w-0 md:flex-row md:gap-2 md:rounded-none md:border-b-2 md:px-3 md:py-2.5 md:text-sm ${
    isActive
      ? 'border-[var(--color-text)] text-[var(--color-text)] md:bg-transparent'
      : 'border-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)] md:hover:bg-transparent'
  }`
}

function NavTab({ tab }: { tab: TabDef }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.path}
      end={tab.end}
      className={({ isActive }) => navLinkClass({ isActive })}
      title={tab.label}
      aria-label={tab.label}
    >
      <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
      <span className="hidden max-w-[4.5rem] truncate md:inline">{tab.label}</span>
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
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="hidden max-w-[8rem] truncate sm:inline">
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
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg">Zebbi OS</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncDot status={syncStatus} error={syncError} />
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)] sm:min-h-0 sm:min-w-0 sm:p-2"
              title={theme === 'light' ? 'Donker thema' : 'Licht thema'}
              aria-label={theme === 'light' ? 'Schakel naar donker thema' : 'Schakel naar licht thema'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-1 border-t border-[var(--color-border)] px-2 py-1 md:border-t-0 md:px-6 md:py-0">
          <div className="flex flex-1 justify-around gap-0.5 md:justify-start md:gap-1">
            {MAIN_TABS.map((tab) => (
              <NavTab key={tab.path} tab={tab} />
            ))}
          </div>
          <div className="flex shrink-0 gap-0.5 border-l border-[var(--color-border)] pl-1 md:pl-3">
            {EXTRA_TABS.map((tab) => (
              <NavTab key={tab.path} tab={tab} />
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  )
}
