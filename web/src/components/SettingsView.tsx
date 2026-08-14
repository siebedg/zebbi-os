import { Moon, SquareTerminal, Sun } from 'lucide-react'
import type { DailyEntry, ShutdownTemplate, WeightEntry } from '../types'
import { useTheme } from '../hooks/useTheme'
import { PALETTE_OPTIONS, type PaletteId } from '../lib/theme'
import { KILL_INSTALLER_PATH } from '../lib/shutdownKill'
import { ExportPanel } from './ExportPanel'
import { HabitContractsImage, saveHabitContractImage } from './HabitContractsImage'
import { WhoopPanel } from './WhoopPanel'
import { PageHeader, Pill, Toggle } from './ui'

export function SettingsView({
  entries,
  weightLog,
  shutdownTemplates,
  activeShutdownTemplateId,
  onSaveShutdownTemplate,
}: {
  entries: DailyEntry[]
  weightLog?: WeightEntry[]
  shutdownTemplates: ShutdownTemplate[]
  activeShutdownTemplateId?: string
  onSaveShutdownTemplate: (template: ShutdownTemplate) => void
}) {
  const { theme, setTheme, palette, setPalette, indicatorMode, setIndicatorMode } = useTheme()
  const shutdownTemplate =
    shutdownTemplates.find((t) => t.id === activeShutdownTemplateId) ??
    shutdownTemplates.find((t) => /daily/i.test(t.name)) ??
    shutdownTemplates[0]

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
        sub="Palette, indicators, Whoop, and export."
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
                      className="h-6 w-6 rounded-full ring-1 ring-white/45 ring-offset-2 ring-offset-[var(--color-surface)]"
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

      <section className="mb-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Whoop
        </p>
        <WhoopPanel />
      </section>

      <section className="mb-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Shutdown
        </p>
        <a
          href={KILL_INSTALLER_PATH}
          download="Zebbi-install-kill.bat"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text)] underline-offset-2 hover:underline"
        >
          <SquareTerminal className="h-4 w-4" />
          Installeer one-click kill
        </a>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          Eerste keer op deze PC: download en run. Daarna sluit de shutdown-knop Discord, Slack, Chrome, Cursor, enz.
        </p>
        {shutdownTemplate && (
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Habit Contracts
            </p>
            <HabitContractsImage
              imageDataUrl={shutdownTemplate.imageDataUrl}
              imageName={shutdownTemplate.imageName}
              editable
              onUpload={(file) => void saveHabitContractImage(shutdownTemplate, file, onSaveShutdownTemplate)}
            />
          </div>
        )}
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
