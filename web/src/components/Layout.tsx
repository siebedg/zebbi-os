import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, LineChart, Moon, PenLine, Sun } from 'lucide-react'
import type { SyncStatus } from '../lib/sync'
import { useTheme } from '../hooks/useTheme'

const TABS = [
  { path: '/', label: 'Vandaag', icon: PenLine, end: true },
  { path: '/maand', label: 'Maand', icon: CalendarDays, end: false },
  { path: '/trend', label: 'Trend', icon: LineChart, end: false },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3, end: false },
] as const

function SyncDot({ status }: { status: SyncStatus }) {
  const title =
    status === 'synced'
      ? 'Opgeslagen in cloud'
      : status === 'syncing'
        ? 'Bezig met opslaan…'
        : status === 'offline'
          ? 'Alleen lokaal — cloud niet bereikbaar'
          : 'Sync'
  const color =
    status === 'synced'
      ? 'bg-[var(--color-good)]'
      : status === 'syncing'
        ? 'bg-amber-400'
        : 'bg-[var(--color-muted)]'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)]" title={title}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="hidden sm:inline">{status === 'offline' ? 'Lokaal' : status === 'synced' ? 'Sync' : '…'}</span>
    </span>
  )
}

export function Layout({
  syncStatus = 'idle',
  children,
}: {
  syncStatus?: SyncStatus
  children: React.ReactNode
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">Zebbi OS</h1>
          <div className="flex items-center gap-3">
            <SyncDot status={syncStatus} />
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
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'border-[var(--color-text)] text-[var(--color-text)]'
                    : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
