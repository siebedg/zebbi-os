import { readFileSync, writeFileSync, copyFileSync } from 'fs'

const REST_DATES = new Set([
  '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-01-31',
  '2026-02-01', '2026-02-09', '2026-02-16',
  '2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-28', '2026-03-29',
  '2026-04-05', '2026-04-12', '2026-04-18', '2026-04-19',
])

const WORK_KEYS = [
  'sessions', 'avgFocus', 'totalHoursWorked', 'totalHoursNet', 'timetable',
  'deepWork1', 'deepWork2', 'deepWork3', 'deepWork4', 'deepWork5', 'deepWork6', 'totalDeepWork',
]

function patchEntry(entry) {
  if (!REST_DATES.has(entry.date)) return entry
  const e = { ...entry, dayType: 'rest' }
  for (const k of WORK_KEYS) delete e[k]
  return e
}

const bundledFiles = [
  'december-2025.json',
  'january-2026.json',
  'february-2026.json',
  'march-2026.json',
  'april-2026.json',
]

const bundled = []
for (const f of bundledFiles) {
  const path = `data/${f}`
  const data = JSON.parse(readFileSync(path, 'utf8')).map(patchEntry)
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
  copyFileSync(path, `web/public/${f}`)
  bundled.push(...data)
}

const seedPath = 'web/public/seed-daily-log.json'
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
const bundledDates = new Set(bundled.map((r) => r.date))
const rest = seed.filter((r) => !bundledDates.has(r.date))
const merged = [...rest, ...bundled].sort((a, b) => a.date.localeCompare(b.date))
writeFileSync(seedPath, JSON.stringify(merged, null, 2))
console.log('Patched', REST_DATES.size, 'rustdagen in bundled data')
