import { loadAISettings, saveAISettings, DEFAULT_AI_SETTINGS, type AISettings } from './aiSettings'
import { parseNotesText } from './parseNotes'
import type { ParsedDay } from './parseNotes'

export { loadAISettings, saveAISettings, DEFAULT_AI_SETTINGS, type AISettings }

/** Try local parse first; optional AI fallback for messy notes */
export async function parseNotesWithAI(text: string, settings?: AISettings): Promise<ParsedDay> {
  const local = parseNotesText(text)
  const hasSessions = local.sessions.length > 0

  const cfg = settings ?? loadAISettings()
  if (!cfg.apiKey.trim() || hasSessions) return local

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          {
            role: 'system',
            content: `Parse daily productivity notes into JSON. Return ONLY valid JSON:
{
  "sessions": [{"startTime":"HH:mm","endTime":"HH:mm","focusPercent":number,"distraction":"string"}],
  "wakeTime":"HH:mm"|null,"bedTime":"HH:mm"|null,"sleepHours":number|null,"sleepScore":0-1|null,
  "meditation":number|null,"gratitude":boolean|null,"exercise":boolean|null,"timetable":number|null
}
Sessions format: "8:00 --> 9:30" then "85%" then "Distraction, duration & cause: none"`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    if (!res.ok) return local

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return local

    const parsed = JSON.parse(jsonMatch[0]) as ParsedDay
    return {
      ...local,
      ...parsed,
      sessions: (parsed.sessions ?? []).map((s) => ({
        ...s,
        id: crypto.randomUUID(),
      })),
    }
  } catch {
    return local
  }
}
