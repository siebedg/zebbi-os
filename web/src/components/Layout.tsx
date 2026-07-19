import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, CalendarDays, LineChart, Moon, PenLine, Scale, Sun, Watch } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const MAIN_TABS = [
  { path: '/maand', label: 'Maand', icon: CalendarDays },
  { path: '/vandaag', label: 'Vandaag', icon: PenLine },
  { path: '/trend', label: 'Oscillation', icon: LineChart },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3 },
] as const

const SECONDARY_TABS = [
  { path: '/lezen', label: 'Lezen', icon: BookOpen },
  { path: '/gewicht', label: 'Gewicht', icon: Scale },
  { path: '/whoop', label: 'Whoop', icon: Watch },
] as const

type TabDef = (typeof MAIN_TABS)[number] | (typeof SECONDARY_TABS)[number]

function NavItem({ tab }: { tab: TabDef }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.path}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors ${
          isActive
            ? 'bg-white/[0.08] font-medium text-white'
            : 'font-normal text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
        }`
      }
    >
      <Icon className="h-[15px] w-[15px] shrink-0 opacity-90" strokeWidth={1.75} />
      <span className="truncate">{tab.label}</span>
    </NavLink>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:flex">
      {/* Desktop: Vercel-style sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-white/[0.08] bg-black pt-[env(safe-area-inset-top)] md:flex">
        <div className="flex h-12 items-center gap-2.5 border-b border-white/[0.08] px-3.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-[11px] font-bold text-black">
            Z
          </span>
          <span className="truncate text-[13px] font-medium text-white">Zebbi OS</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {MAIN_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}

          <div className="my-2.5 mx-2 border-t border-white/[0.08]" />

          {SECONDARY_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}
        </nav>

        <div className="border-t border-white/[0.08] px-2 py-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
            title={theme === 'light' ? 'Donker thema' : 'Licht thema'}
            aria-label={theme === 'light' ? 'Schakel naar donker thema' : 'Schakel naar licht thema'}
          >
            {theme === 'light' ? (
              <Moon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            ) : (
              <Sun className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            )}
            <span>Thema</span>
          </button>
        </div>
      </aside>

      {/* Mobile: compact top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-[env(safe-area-inset-top)] md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-text)]">Zebbi OS</h1>
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

      <main className="min-w-0 flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:ml-[240px] md:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
