import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LineChart,
  Moon,
  PenLine,
  Scale,
  Sun,
} from 'lucide-react'
import { useStore } from '../hooks/useStore'
import { useTheme } from '../hooks/useTheme'
import { PALETTE_OPTIONS, type PaletteId } from '../lib/theme'
import { ExportPanel } from './ExportPanel'
import { Toggle } from './ui'

const MAIN_TABS = [
  { path: '/maand', label: 'Maand', icon: CalendarDays },
  { path: '/vandaag', label: 'Vandaag', icon: PenLine },
  { path: '/trend', label: 'Oscillation', icon: LineChart },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3 },
] as const

const SECONDARY_TABS = [
  { path: '/gewicht', label: 'Gewicht', icon: Scale },
  { path: '/shutdown', label: 'Shutdown', icon: ClipboardCheck },
] as const

type TabDef = (typeof MAIN_TABS)[number] | (typeof SECONDARY_TABS)[number]

function NavItem({ tab }: { tab: TabDef }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.path}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
          isActive
            ? 'bg-[var(--color-sidebar-active)] font-medium text-[var(--color-sidebar-text)] ring-1 ring-white/10'
            : 'font-normal text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-sidebar-text)]'
        }`
      }
    >
      <Icon className="h-[15px] w-[15px] shrink-0 opacity-90" strokeWidth={1.75} />
      <span className="truncate">{tab.label}</span>
    </NavLink>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, palette, setPalette, indicatorMode, setIndicatorMode } = useTheme()
  const { state } = useStore()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:flex">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] pt-[env(safe-area-inset-top)] md:flex"
      >
        <div className="flex h-14 items-center gap-3 border-b border-[var(--color-sidebar-border)] px-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-[var(--color-sidebar-bg)]"
          >
            Z
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-medium tracking-tight text-[var(--color-sidebar-text)]">
              Zebbi
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-sidebar-muted)]">
              personal OS
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {MAIN_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}

          <div className="my-2.5 mx-2 border-t border-[var(--color-sidebar-border)]" />

          {SECONDARY_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}
        </nav>

        <div className="space-y-3 border-t border-[var(--color-sidebar-border)] p-3">
          <div className="rounded-lg border border-[var(--color-sidebar-border)] bg-black/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-sidebar-muted)]">
              Palette
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {PALETTE_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                    palette === p.id
                      ? 'bg-[var(--color-accent)] text-[var(--color-sidebar-bg)]'
                      : 'text-[var(--color-sidebar-muted)] hover:text-[var(--color-sidebar-text)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Toggle
            label="Neutral indicators"
            checked={indicatorMode === 'neutral'}
            onChange={(on) => setIndicatorMode(on ? 'neutral' : 'color')}
          />

          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-[var(--color-sidebar-muted)] transition-colors hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-sidebar-text)]"
            aria-label={theme === 'light' ? 'Schakel naar donker thema' : 'Schakel naar licht thema'}
          >
            {theme === 'light' ? (
              <Moon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            ) : (
              <Sun className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            )}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div>
            <h1 className="font-display text-base font-medium tracking-tight text-[var(--color-text)]">
              Zebbi
            </h1>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
              personal OS
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted)]"
            aria-label="Thema"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 scroll-touch">
          <div className="flex gap-1">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                      isActive
                        ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)]'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </NavLink>
              )
            })}
          </div>
          <div className="mx-1 w-px shrink-0 self-stretch bg-[var(--color-border)]" />
          <div className="flex gap-1">
            {SECONDARY_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                      isActive
                        ? 'bg-[var(--color-surface-overlay)] font-medium text-[var(--color-text)]'
                        : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-overlay)]'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:ml-[248px] md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {children}

          <ExportPanel entries={state.dailyLog} weightLog={state.weightLog} />

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:hidden">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Weergave
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id as PaletteId)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    palette === p.id
                      ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                      : 'text-[var(--color-muted)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Toggle
                label="Neutral indicators"
                checked={indicatorMode === 'neutral'}
                onChange={(on) => setIndicatorMode(on ? 'neutral' : 'color')}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
