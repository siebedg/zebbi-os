export type Theme = 'light' | 'dark'

export type PaletteId =
  | 'default'
  | 'graphite'
  | 'espresso'
  | 'ink'
  | 'lagoon'
  | 'copper'
  | 'glacier'

export type IndicatorMode = 'color' | 'neutral'

const THEME_KEY = 'daily-log-theme'
const PALETTE_KEY = 'zebbi-palette'
const INDICATOR_KEY = 'zebbi-indicator-mode'

const PALETTE_IDS: readonly PaletteId[] = [
  'default',
  'graphite',
  'espresso',
  'ink',
  'lagoon',
  'copper',
  'glacier',
]

export const PALETTE_OPTIONS: {
  id: PaletteId
  label: string
  hint: string
  swatches: [string, string, string]
}[] = [
  { id: 'espresso', label: 'Espresso olive', hint: 'Warm stone, muted olive', swatches: ['#a3b18a', '#4d7c0f', '#f6f3ee'] },
  { id: 'graphite', label: 'Graphite amber', hint: 'Charcoal, amber', swatches: ['#fbbf24', '#d97706', '#fafafa'] },
  { id: 'ink', label: 'Ink rose', hint: 'Navy, rose', swatches: ['#fb7185', '#e11d48', '#fff1f2'] },
  { id: 'lagoon', label: 'Lagoon teal', hint: 'Seafoam, deep teal', swatches: ['#5eead4', '#0f766e', '#f0fdfa'] },
  { id: 'copper', label: 'Copper bronze', hint: 'Warm clay, copper', swatches: ['#f59e0b', '#c2410c', '#fff7ed'] },
  { id: 'glacier', label: 'Glacier blue', hint: 'Ice, slate blue', swatches: ['#7dd3fc', '#0369a1', '#f0f9ff'] },
  { id: 'default', label: 'Stone', hint: 'Cool paper, steel', swatches: ['#a1a1aa', '#3f3f46', '#fafafa'] },
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
    if (stored && (PALETTE_IDS as readonly string[]).includes(stored)) {
      return stored as PaletteId
    }
  } catch {
    /* ignore */
  }
  return 'espresso'
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
