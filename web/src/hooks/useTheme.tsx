import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  applyIndicatorMode,
  applyPalette,
  applyTheme,
  bootstrapTheme,
  type IndicatorMode,
  type PaletteId,
  type Theme,
} from '../lib/theme'

const ThemeContext = createContext<{
  theme: Theme
  palette: PaletteId
  indicatorMode: IndicatorMode
  toggleTheme: () => void
  setTheme: (t: Theme) => void
  setPalette: (p: PaletteId) => void
  setIndicatorMode: (m: IndicatorMode) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const boot = bootstrapTheme()
  const [theme, setThemeState] = useState<Theme>(boot.theme)
  const [palette, setPaletteState] = useState<PaletteId>(boot.palette)
  const [indicatorMode, setIndicatorModeState] = useState<IndicatorMode>(boot.indicatorMode)

  const setTheme = (t: Theme) => {
    applyTheme(t)
    setThemeState(t)
  }

  const setPalette = (p: PaletteId) => {
    applyPalette(p)
    setPaletteState(p)
  }

  const setIndicatorMode = (m: IndicatorMode) => {
    applyIndicatorMode(m)
    setIndicatorModeState(m)
  }

  const toggleTheme = () => {
    setThemeState((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        indicatorMode,
        toggleTheme,
        setTheme,
        setPalette,
        setIndicatorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
