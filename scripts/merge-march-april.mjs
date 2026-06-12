import { readFileSync, writeFileSync, copyFileSync } from 'fs'

const march = JSON.parse(readFileSync('data/march-2026.json', 'utf8'))
const april = JSON.parse(readFileSync('data/april-2026.json', 'utf8'))
const seedPath = 'web/public/seed-daily-log.json'
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))

const bundledDates = new Set([...march, ...april].map((r) => r.date))
const rest = seed.filter((r) => !bundledDates.has(r.date))
const merged = [...rest, ...march, ...april].sort((a, b) => a.date.localeCompare(b.date))

writeFileSync(seedPath, JSON.stringify(merged, null, 2))
copyFileSync('data/march-2026.json', 'web/public/march-2026.json')
copyFileSync('data/april-2026.json', 'web/public/april-2026.json')
console.log('Merged', march.length, '+', april.length, 'rows (', merged.length, 'total)')
