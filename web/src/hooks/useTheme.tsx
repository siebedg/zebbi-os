import { createContext, useContext, useState, type ReactNode } from 'react'
import { applyTheme, getStoredTheme, type Theme } from '../lib/theme'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const t = getStoredTheme()
    applyTheme(t)
    return t
  })

  const setTheme = (t: Theme) => {
    applyTheme(t)
    setThemeState(t)
  }

  const toggleTheme = () => {
    setThemeState((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
