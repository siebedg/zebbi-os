import { MONTH_VIEW_COLUMNS } from './colors'

export type FieldVisibilityKey = 'wakeTime' | 'bedTime' | 'sleepHours' | 'sleepScore' | 'gratitude'

export type FieldVisibility = Record<FieldVisibilityKey, boolean>

const STORAGE_KEY = 'zebbi-field-visibility'

export const FIELD_VISIBILITY_LABELS: Record<FieldVisibilityKey, string> = {
  wakeTime: 'Wake time',
  bedTime: 'Bed time',
  sleepHours: 'Sleep hours',
  sleepScore: 'Sleep score',
  gratitude: 'Gratitude journal',
}

/** Standaard: alleen sleep score; wake, bed, gratitude verborgen. */
export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  wakeTime: false,
  bedTime: false,
  sleepHours: false,
  sleepScore: true,
  gratitude: false,
}

export function loadFieldVisibility(): FieldVisibility {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FIELD_VISIBILITY }
    const parsed = JSON.parse(raw) as Partial<FieldVisibility>
    return { ...DEFAULT_FIELD_VISIBILITY, ...parsed }
  } catch {
    return { ...DEFAULT_FIELD_VISIBILITY }
  }
}

export function saveFieldVisibility(settings: FieldVisibility): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function isToggleableField(key: string): key is FieldVisibilityKey {
  return key in DEFAULT_FIELD_VISIBILITY
}

export function filterMonthColumns(visibility: FieldVisibility) {
  return MONTH_VIEW_COLUMNS.filter((col) => {
    if (isToggleableField(col.key)) return visibility[col.key]
    return true
  })
}
