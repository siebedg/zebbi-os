import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, CalendarDays, LineChart, Moon, PenLine, Scale, Sun, Watch } from 'lucide-react'
import type { SyncStatus } from '../lib/sync'
import { useTheme } from '../hooks/useTheme'

const MAIN_TABS = [
  { path: '/', label: 'Vandaag', icon: PenLine, end: true },
  { path: '/maand', label: 'Maand', icon: CalendarDays, end: false },
  { path: '/trend', label: 'Oscillation', icon: LineChart, end: false },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3, end: false },
] as const

const EXTRA_TABS = [
  { path: '/lezen', label: 'Lezen', icon: BookOpen, end: false },
  { path: '/gewicht', label: 'Gewicht', icon: Scale, end: false },
  { path: '/whoop', label: 'Whoop', icon: Watch, end: false },
] as const

type TabDef = (typeof MAIN_TABS)[number] | (typeof EXTRA_TABS)[number]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-[var(--color-surface-overlay)] text-[var(--color-text)]'
      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]'
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
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/nav:max-w-[9rem] group-hover/nav:opacity-100">
        {tab.label}
      </span>
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
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/nav:max-w-[5rem] group-hover/nav:opacity-100">
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
    <div className="min-h-screen bg-[var(--color-bg)] md:flex">
      {/* Desktop / tablet: left rail */}
      <aside className="group/nav fixed inset-y-0 left-0 z-40 hidden w-14 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] pt-[env(safe-area-inset-top)] transition-[width] duration-200 hover:w-52 md:flex">
        <div className="flex h-14 items-center gap-2 overflow-hidden px-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-text)] text-sm font-bold text-[var(--color-bg)]">
            Z
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover/nav:max-w-[8rem] group-hover/nav:opacity-100">
            Zebbi OS
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden px-2 py-2">
          {MAIN_TABS.map((tab) => (
            <NavTab key={tab.path} tab={tab} />
          ))}
          <div className="my-2 border-t border-[var(--color-border)]" />
          {EXTRA_TABS.map((tab) => (
            <NavTab key={tab.path} tab={tab} />
          ))}
        </nav>

        <div className="flex flex-col gap-2 overflow-hidden border-t border-[var(--color-border)] px-3 py-3">
          <SyncDot status={syncStatus} error={syncError} />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]"
            title={theme === 'light' ? 'Donker thema' : 'Licht thema'}
            aria-label={theme === 'light' ? 'Schakel naar donker thema' : 'Schakel naar licht thema'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover/nav:max-w-[6rem] group-hover/nav:opacity-100">
              Thema
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile: bottom-ish sticky top compact bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">Zebbi OS</h1>
          <div className="flex items-center gap-2">
            <SyncDot status={syncStatus} error={syncError} />
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted)]"
              aria-label="Thema"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto px-2 pb-2 scroll-touch">
          {[...MAIN_TABS, ...EXTRA_TABS].map((tab) => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                      : 'bg-[var(--color-surface-overlay)] text-[var(--color-muted)]'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </NavLink>
            )
          })}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:ml-14 md:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
