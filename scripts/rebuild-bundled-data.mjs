import { readFileSync, writeFileSync, copyFileSync } from 'fs'

const VACATION_DATES = [
  '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28',
]

const MONTHS = {
  december: { year: 2025, month: 12, hasScore: false, dwCount: 6 },
  january: { year: 2026, month: 1, hasScore: true, dwCount: 5 },
  februari: { year: 2026, month: 2, hasScore: true, dwCount: 5 },
  february: { year: 2026, month: 2, hasScore: true, dwCount: 5 },
  march: { year: 2026, month: 3, hasScore: true, dwCount: 5 },
  april: { year: 2026, month: 4, hasScore: true, dwCount: 5 },
  may: { year: 2026, month: 5, hasScore: true, dwCount: 5 },
  june: { year: 2026, month: 6, hasScore: true, dwCount: 5 },
  juni: { year: 2026, month: 6, hasScore: true, dwCount: 5 },
}

// eslint-disable-next-line -- raw spreadsheet paste
const DATA = readFileSync(new URL('./bundled-source.tsv', import.meta.url), 'utf8')

function parseTime12(s) {
  if (!s?.trim()) return undefined
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return undefined
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  if (ap === 'AM' && h === 12) h = 0
  if (ap === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${min}`
}

function num(s) {
  if (s == null || !String(s).trim()) return undefined
  const n = parseFloat(String(s).replace(',', '.').replace('%', ''))
  return Number.isNaN(n) ? undefined : n
}

function detectMonth(line) {
  const m = line.match(/^(December|January|Februari|February|March|April|May|June|Juni)\s+\d/i)
  return m ? m[1].toLowerCase() : null
}

function parseLine(line, cfg) {
  const parts = line.split('\t')
  const day = parseInt(parts[0].replace(/\D/g, ''), 10)
  if (!day) return null
  const date = `${cfg.year}-${String(cfg.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const entry = { date }
  const noteParts = []

  const wake = parseTime12(parts[1])
  const bed = parseTime12(parts[2])
  if (wake) entry.wakeTime = wake
  if (bed) entry.bedTime = bed

  let col = 3
  const sleepHours = num(parts[col])
  if (sleepHours != null) entry.sleepHours = sleepHours
  col++

  if (cfg.hasScore) {
    const score = num(parts[col])
    if (score != null) entry.sleepScore = score / 100
    col++
  }

  const med = num(parts[col])
  if (med != null) entry.meditation = med
  col++
  const gr = num(parts[col])
  if (gr != null) entry.gratitude = gr === 1
  col++
  const ex = num(parts[col])
  if (ex != null) entry.exercise = ex === 1
  col++
  const focusRaw = parts[col]?.trim()
  const focus = num(focusRaw)
  if (focus != null) entry.avgFocus = focus
  else if (focusRaw) noteParts.push(focusRaw)
  col++

  for (let i = 0; i < cfg.dwCount; i++) {
    const rawDw = parts[col + i]
    const v = num(rawDw)
    if (v != null) entry[`deepWork${i + 1}`] = v
    else if (rawDw?.trim()) noteParts.push(rawDw.trim())
  }
  col += cfg.dwCount

  const tot = num(parts[col])
  if (tot != null) entry.totalDeepWork = tot
  col++

  if (cfg.hasScore) {
    const tt = num(parts[col])
    if (tt != null) entry.timetable = tt
    col++
  }

  for (let i = col; i < parts.length; i++) {
    const t = parts[i]?.trim()
    if (t) noteParts.push(t)
  }
  if (noteParts.length) entry.notes = noteParts.join(' · ')

  if (VACATION_DATES.includes(date)) entry.dayType = 'vacation'

  const hasData =
    entry.wakeTime ||
    entry.bedTime ||
    entry.sleepHours != null ||
    entry.meditation != null ||
    entry.gratitude != null ||
    entry.exercise != null ||
    entry.avgFocus != null ||
    entry.totalDeepWork != null ||
    entry.timetable != null ||
    entry.notes ||
    entry.dayType
  return hasData ? entry : null
}

function parseAll(raw) {
  const byFile = {
    'december-2025.json': [],
    'january-2026.json': [],
    'february-2026.json': [],
    'march-2026.json': [],
    'april-2026.json': [],
    'may-2026.json': [],
    'june-2026.json': [],
  }
  let cfg = MONTHS.december
  let file = 'december-2025.json'

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || /^Date\t/i.test(trimmed)) continue
    const monthKey = detectMonth(trimmed)
    if (monthKey) {
      cfg = MONTHS[monthKey]
      if (cfg.month === 12) file = 'december-2025.json'
      else if (cfg.month === 1) file = 'january-2026.json'
      else if (cfg.month === 2) file = 'february-2026.json'
      else if (cfg.month === 3) file = 'march-2026.json'
      else if (cfg.month === 4) file = 'april-2026.json'
      else if (cfg.month === 5) file = 'may-2026.json'
      else if (cfg.month === 6) file = 'june-2026.json'
    }
    const entry = parseLine(trimmed, cfg)
    if (entry) byFile[file].push(entry)
  }

  for (const d of VACATION_DATES) {
    const feb = byFile['february-2026.json']
    if (!feb.some((r) => r.date === d)) feb.push({ date: d, dayType: 'vacation' })
  }

  for (const [name, rows] of Object.entries(byFile)) {
    rows.sort((a, b) => a.date.localeCompare(b.date))
    writeFileSync(`data/${name}`, JSON.stringify(rows, null, 2) + '\n')
    copyFileSync(`data/${name}`, `web/public/${name}`)
    console.log(name, rows.length, 'rows')
  }

  const bundled = Object.values(byFile).flat()
  const seedPath = 'web/public/seed-daily-log.json'
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  const dates = new Set(bundled.map((r) => r.date))
  const merged = [...seed.filter((r) => !dates.has(r.date) && r.date !== '2025-11-30'), ...bundled].sort(
    (a, b) => a.date.localeCompare(b.date),
  )
  writeFileSync(seedPath, JSON.stringify(merged, null, 2))
  console.log('seed', merged.length, 'rows')
}

parseAll(DATA)
