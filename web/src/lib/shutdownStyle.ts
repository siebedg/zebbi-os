import type { ShutdownTemplate } from '../types'

/** The ways the shutdown can be played. One is picked per day. */
export const SHUTDOWN_STYLES = [
  { id: 'focus', name: 'Focus', hint: 'Eén stap tegelijk, groot in beeld' },
  { id: 'path', name: 'Bordspel', hint: 'Zet je pion stap voor stap vooruit' },
  { id: 'deck', name: 'Kaartspel', hint: 'Speel elke kaart weg' },
  { id: 'terminal', name: 'Terminal', hint: 'Typ je avond af' },
  { id: 'hold', name: 'Vasthouden', hint: 'Houd vast om elke stap te bevestigen' },
  { id: 'sky', name: 'Sterrenhemel', hint: 'Steek elke ster aan' },
] as const

export type ShutdownStyleId = (typeof SHUTDOWN_STYLES)[number]['id']

/** One accent per day, on a different cycle than the styles so combinations keep changing. */
const DAY_ACCENTS = ['#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#0ea5e9', '#eab308', '#22c55e']

const OVERRIDE_KEY = 'zebbi-shutdown-style'

export function dayNumber(d = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}

export function dayAccent(day = dayNumber()): string {
  return DAY_ACCENTS[day % DAY_ACCENTS.length]
}

/** Today's style: consecutive days never share one. A manual shuffle overrides it for today only. */
export function todayStyleIndex(day = dayNumber()): number {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { day: number; index: number }
      if (saved.day === day && saved.index >= 0 && saved.index < SHUTDOWN_STYLES.length) {
        return saved.index
      }
    }
  } catch {
    /* ignore */
  }
  return day % SHUTDOWN_STYLES.length
}

export function shuffleStyle(current: number, day = dayNumber()): number {
  let next = current
  while (next === current) next = Math.floor(Math.random() * SHUTDOWN_STYLES.length)
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ day, index: next }))
  } catch {
    /* ignore */
  }
  return next
}

/** Small seeded RNG so a day's layout (e.g. star positions) stays put on reload. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ShutdownStep = { key: string; text: string; section: string }

export function isSupplementItem(text: string): boolean {
  return text.toLowerCase().includes('supplement')
}

/** All steps in play order: supplements first (they gate the rest), then the routine as written. */
export function buildShutdownSteps(template: ShutdownTemplate): ShutdownStep[] {
  const all: ShutdownStep[] = []
  for (const section of template.sections) {
    section.items.forEach((text, idx) => {
      all.push({ key: `${section.id}-${idx}`, text, section: section.title })
    })
  }
  return [...all.filter((s) => isSupplementItem(s.text)), ...all.filter((s) => !isSupplementItem(s.text))]
}
