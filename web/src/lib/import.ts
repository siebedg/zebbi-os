import * as XLSX from 'xlsx'
import type { DailyEntry } from '../types'
import { enrichEntry } from './sessions'
import { mergeDailyEntries, normalizeImportedRow } from './utils'

function processDailyRow(row: Record<string, unknown>): DailyEntry | null {
  const dateVal = row.Date ?? row.date
  if (!dateVal) return null

  const dateStr =
    dateVal instanceof Date
      ? `${dateVal.getUTCFullYear()}-${String(dateVal.getUTCMonth() + 1).padStart(2, '0')}-${String(dateVal.getUTCDate()).padStart(2, '0')}`
      : String(dateVal).slice(0, 10)

  const processed: Record<string, unknown> = { ...row, Date: dateStr }

  for (const key of ['Wake time ', 'Wake time', 'Bed time']) {
    const v = row[key]
    if (v instanceof Date) {
      const field = key.includes('Wake') ? 'Wake time' : 'Bed time'
      processed[field] = `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
    }
  }

  const entry = normalizeImportedRow(processed)
  return entry ? enrichEntry(entry) : null
}

export async function importDailyExcel(file: File): Promise<DailyEntry[]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { cellDates: true })
  const sheet = wb.Sheets['Daily log'] ?? wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.map(processDailyRow).filter((e): e is DailyEntry => e != null)
}

export function importJsonFile(file: File): Promise<DailyEntry[]> {
  return file.text().then((text) => {
    const raw = JSON.parse(text) as Record<string, unknown>[]
    return raw
      .map(normalizeImportedRow)
      .filter((e): e is DailyEntry => e != null)
      .map(enrichEntry)
  })
}

export function mergeImport(existing: DailyEntry[], imported: DailyEntry[]): DailyEntry[] {
  return mergeDailyEntries(existing, imported)
}
