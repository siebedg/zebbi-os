import { ImagePlus } from 'lucide-react'
import { compressImage } from '../lib/image'
import { normalizeShutdownTemplate } from '../lib/shutdown'
import type { ShutdownTemplate } from '../types'

export function HabitContractsImage({
  imageDataUrl,
  imageName,
  editable,
  onUpload,
}: {
  imageDataUrl?: string
  imageName?: string
  editable?: boolean
  onUpload?: (file: File) => void
}) {
  return (
    <div className="space-y-3">
      {imageDataUrl ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
          <img
            src={imageDataUrl}
            alt={imageName || 'Habit contracts'}
            className="max-h-80 w-full object-contain bg-[var(--color-surface)]"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          Nog geen foto
        </div>
      )}
      {editable && onUpload && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text)]">
          <ImagePlus className="h-3.5 w-3.5" />
          {imageDataUrl ? 'Vervang foto' : 'Upload foto'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

export async function saveHabitContractImage(
  template: ShutdownTemplate,
  file: File,
  onSave: (template: ShutdownTemplate) => void,
): Promise<void> {
  const { dataUrl, name } = await compressImage(file)
  onSave(
    normalizeShutdownTemplate({
      ...template,
      imageDataUrl: dataUrl,
      imageName: name,
      updatedAt: new Date().toISOString(),
    }),
  )
}
