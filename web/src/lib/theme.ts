export type Theme = 'light' | 'dark'

export type PaletteId = 'default' | 'graphite' | 'espresso' | 'ink'

export type IndicatorMode = 'color' | 'neutral'

const THEME_KEY = 'daily-log-theme'
const PALETTE_KEY = 'zebbi-palette'
const INDICATOR_KEY = 'zebbi-indicator-mode'

export const PALETTE_OPTIONS: { id: PaletteId; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'graphite', label: 'Graphite amber' },
  { id: 'espresso', label: 'Espresso olive' },
  { id: 'ink', label: 'Ink rose' },
]

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return getSystemTheme()
}

export function getStoredPalette(): PaletteId {
  try {
    const stored = localStorage.getItem(PALETTE_KEY)
    if (stored === 'default' || stored === 'graphite' || stored === 'espresso' || stored === 'ink') {
      return stored
    }
  } catch {
    /* ignore */
  }
  return 'graphite'
}

export function getStoredIndicatorMode(): IndicatorMode {
  try {
    const stored = localStorage.getItem(INDICATOR_KEY)
    if (stored === 'color' || stored === 'neutral') return stored
  } catch {
    /* ignore */
  }
  return 'color'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function applyPalette(palette: PaletteId): void {
  document.documentElement.dataset.palette = palette
  try {
    localStorage.setItem(PALETTE_KEY, palette)
  } catch {
    /* ignore */
  }
}

export function applyIndicatorMode(mode: IndicatorMode): void {
  document.documentElement.dataset.indicator = mode
  try {
    localStorage.setItem(INDICATOR_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function bootstrapTheme(): { theme: Theme; palette: PaletteId; indicatorMode: IndicatorMode } {
  const theme = getStoredTheme()
  const palette = getStoredPalette()
  const indicatorMode = getStoredIndicatorMode()
  applyTheme(theme)
  applyPalette(palette)
  applyIndicatorMode(indicatorMode)
  return { theme, palette, indicatorMode }
}

export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark')
}
