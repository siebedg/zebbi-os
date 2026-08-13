import { Moon, Sun } from 'lucide-react'
import type { DailyEntry, WeightEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { PALETTE_OPTIONS, type PaletteId } from '../lib/theme'
import { ExportPanel } from './ExportPanel'
import { PageHeader, Pill, Toggle } from './ui'

export function SettingsView({
  entries,
  weightLog,
}: {
  entries: DailyEntry[]
  weightLog?: WeightEntry[]
}) {
  const { theme, setTheme, palette, setPalette, indicatorMode, setIndicatorMode } = useTheme()

  return (
    <div className="osc-fade-up mx-auto max-w-lg pb-12">
      <PageHeader
        className="mb-12"
        eyebrow="Settings"
        title={
          <>
            Look and <span className="italic">feel</span>
          </>
        }
        sub="Palette, indicators, and export."
      />

      <section className="mb-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Appearance
        </p>
        <div className="flex justify-center gap-1">
          <Pill active={theme === 'light'} onClick={() => setTheme('light')}>
            <span className="inline-flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" />
              Light
            </span>
          </Pill>
          <Pill active={theme === 'dark'} onClick={() => setTheme('dark')}>
            <span className="inline-flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5" />
              Dark
            </span>
          </Pill>
        </div>
      </section>

      <section className="mb-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Palette
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PALETTE_OPTIONS.map((p) => {
            const on = palette === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id as PaletteId)}
                className={`rounded-2xl border p-4 text-left transition ${
                  on
                    ? 'border-[var(--color-text)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]/60 hover:border-[var(--color-text)]/25'
                }`}
              >
                <div className="mb-3 flex gap-1.5">
                  {p.swatches.map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-[var(--color-text)]">{p.label}</p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{p.hint}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Neutral indicators
        </p>
        <Toggle
          label="Neutral indicators"
          checked={indicatorMode === 'neutral'}
          onChange={(on) => setIndicatorMode(on ? 'neutral' : 'color')}
        />
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          Grayscale cells instead of score colors. Scores still exist; they just don’t shout.
        </p>
      </section>

      <section>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Export
        </p>
        <p className="mb-3 text-xs leading-relaxed text-[var(--color-muted)]">
          JSON download of Markdown copy — daily log, baselines en floors.
        </p>
        <ExportPanel entries={entries} weightLog={weightLog} embedded />
      </section>
    </div>
  )
}
