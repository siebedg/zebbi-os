import type { ShutdownTemplate } from '../types'
import { uid } from './utils'

function section(title: string, items: string[]) {
  return { id: uid(), title, items }
}

export function createDefaultShutdownTemplates(): ShutdownTemplate[] {
  const now = new Date().toISOString()
  return [
    {
      id: uid(),
      name: 'Daily shutdown',
      introMessage: 'Als je alle stappen doorneemt voel je je altijd fulfilled en oprecht euphoric.\nLiefs, Siebe.',
      encouragement: 'Start rustig. Kill noise first, then close the day well.',
      timerMinutes: 15,
      sections: [
        section('Social close-out', ['Reply to all people in Instagram & Messenger']),
        section('Before anything else', [
          'Take your supplements NOW before you continue',
          'Plan tomorrow',
          'Output Zebbi',
        ]),
        section('Intention + remove friction', [
          'Intention + Google Calendar',
          'Remove friction (War Map, To-do, V2 ✉️, timer, work)',
          'Turn computer in greyscale',
        ]),
        section('Body', [
          'Take yoga mat → now do some yoga with Bend — op het einde & tennisbal 🎾',
        ]),
      ],
      updatedAt: now,
    },
    {
      id: uid(),
      name: 'Condensed shutdown',
      introMessage: 'Korte versie voor avonden waarop je wel wilt afsluiten maar niet uitrollen.',
      encouragement: 'Short, clean, no excuses.',
      timerMinutes: 7,
      sections: [
        section('Must do', [
          'Reply to urgent messages',
          'Plan tomorrow',
          'Set first work block up',
        ]),
        section('Reset', ['Take supplements', 'Greyscale + yoga mat']),
      ],
      updatedAt: now,
    },
  ]
}

/** Rewrites older wording in saved routines to the current text. */
export function migrateShutdownItem(raw: string): string {
  const item = raw.trim()
  if (/^remove friction/i.test(item)) {
    return item
      .replace(/\bwarm[\s-]?up\s*/gi, '')
      .replace(/\bV1\.1\b(\s*✉️)?/g, 'V2 ✉️')
      .replace(/\s+,/g, ',')
      .replace(/,(\s*,)+/g, ',')
      .replace(/\(\s+/g, '(')
  }
  if (/^intention\b/i.test(item) && /timetable/i.test(item)) {
    return 'Intention + Google Calendar'
  }
  return item
}

export function normalizeShutdownTemplate(
  value: Partial<ShutdownTemplate>,
  fallback?: ShutdownTemplate,
): ShutdownTemplate {
  const base = fallback ?? createDefaultShutdownTemplates()[0]
  const sections =
    value.sections
      ?.map((sectionValue, idx) => ({
        id: sectionValue.id || `${base.id}-section-${idx + 1}`,
        title: sectionValue.title?.trim() || `Section ${idx + 1}`,
        items: (sectionValue.items ?? []).map(migrateShutdownItem).filter(Boolean),
      }))
      .filter((sectionValue) => sectionValue.items.length > 0) ?? base.sections

  return {
    id: value.id || base.id || uid(),
    name: value.name?.trim() || base.name,
    introMessage: value.introMessage?.trim() || base.introMessage,
    encouragement: value.encouragement?.trim() || base.encouragement,
    timerMinutes:
      typeof value.timerMinutes === 'number' && Number.isFinite(value.timerMinutes)
        ? Math.max(1, Math.min(60, Math.round(value.timerMinutes)))
        : base.timerMinutes,
    imageDataUrl: value.imageDataUrl || base.imageDataUrl,
    imageName: value.imageName || base.imageName,
    sections,
    updatedAt: value.updatedAt || base.updatedAt || new Date().toISOString(),
  }
}

export const SHUTDOWN_QR_PAYLOAD = 'https://zebbi-os.vercel.app/shutdown'

export function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const mm = Math.floor(safe / 60)
  const ss = safe % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
