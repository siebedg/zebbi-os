import { readFileSync, writeFileSync, copyFileSync } from 'fs'

const january = JSON.parse(readFileSync('data/january-2026.json', 'utf8'))
const seedPath = 'web/public/seed-daily-log.json'
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))

const janDates = new Set(january.map((r) => r.date))
const rest = seed.filter((r) => !janDates.has(r.date))
const merged = [...rest, ...january].sort((a, b) => a.date.localeCompare(b.date))

writeFileSync(seedPath, JSON.stringify(merged, null, 2))
copyFileSync('data/january-2026.json', 'web/public/january-2026.json')
console.log('Merged', january.length, 'January rows (', merged.length, 'total)')
