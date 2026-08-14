import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LineChart,
  PenLine,
  Repeat,
  Scale,
  Settings,
} from 'lucide-react'
import { ShutdownTimerDock } from './ShutdownTimerDock'

const MAIN_TABS = [
  { path: '/maand', label: 'Maand', icon: CalendarDays },
  { path: '/vandaag', label: 'Vandaag', icon: PenLine },
  { path: '/trend', label: 'Oscillation', icon: LineChart },
  { path: '/grafieken', label: 'Grafieken', icon: BarChart3 },
  { path: '/review', label: '30d', icon: Repeat },
] as const

const SECONDARY_TABS = [{ path: '/gewicht', label: 'Gewicht', icon: Scale }] as const

const FOOTER_TABS = [
  { path: '/shutdown', label: 'Shutdown', icon: ClipboardCheck },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const

type TabDef = (typeof MAIN_TABS)[number] | (typeof SECONDARY_TABS)[number] | (typeof FOOTER_TABS)[number]

function NavItem({ tab }: { tab: TabDef }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.path}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
          isActive
            ? 'bg-[var(--color-sidebar-active)] font-medium text-[var(--color-sidebar-text)]'
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
  return (
    <div className="min-h-screen bg-transparent md:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] pt-[env(safe-area-inset-top)] md:flex">
        <div className="flex h-16 items-center px-5">
          <div className="min-w-0">
            <p className="font-display text-[17px] font-medium tracking-tight text-[var(--color-sidebar-text)]">
              Zebbi
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-sidebar-muted)]">
              personal OS
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {MAIN_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}

          <div className="my-3 mx-2 border-t border-[var(--color-sidebar-border)]" />

          {SECONDARY_TABS.map((tab) => (
            <NavItem key={tab.path} tab={tab} />
          ))}

          <div className="mt-auto border-t border-[var(--color-sidebar-border)] pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {FOOTER_TABS.map((tab) => (
              <NavItem key={tab.path} tab={tab} />
            ))}
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md pt-[env(safe-area-inset-top)] md:hidden">
        <div className="px-4 py-3">
          <h1 className="font-display text-base font-medium tracking-tight text-[var(--color-text)]">
            Zebbi
          </h1>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
            personal OS
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 scroll-touch">
          <div className="flex gap-1">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
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
            {[...SECONDARY_TABS, ...FOOTER_TABS].map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
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

      <main className="min-w-0 flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10 md:ml-[232px] md:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <ShutdownTimerDock />
    </div>
  )
}
