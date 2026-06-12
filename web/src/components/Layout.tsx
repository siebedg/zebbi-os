import { BarChart3, CalendarDays, Moon, PenLine, Sun } from 'lucide-react'
import type { TabId } from '../types'
import { useTheme } from '../hooks/useTheme'

const TABS: { id: TabId; label: string; icon: typeof PenLine }[] = [
  { id: 'entry', label: 'Vandaag', icon: PenLine },
  { id: 'timeline', label: 'Maand', icon: CalendarDays },
  { id: 'charts', label: 'Grafieken', icon: BarChart3 },
]

export function Layout({
  active,
  onTab,
  children,
}: {
  active: TabId
  onTab: (id: TabId) => void
  children: React.ReactNode
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">Zebbi OS</h1>
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
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'border-[var(--color-text)] text-[var(--color-text)]'
                    : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
