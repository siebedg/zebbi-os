export interface AISettings {
  apiKey: string
  baseUrl: string
  model: string
}

const AI_SETTINGS_KEY = 'improvement-dashboard-ai'

export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY)
    return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_AI_SETTINGS }
  } catch {
    return { ...DEFAULT_AI_SETTINGS }
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
}
