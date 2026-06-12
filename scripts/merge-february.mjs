import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const february = JSON.parse(readFileSync('data/february-2026.json', 'utf8'));
const seedPath = 'web/public/seed-daily-log.json';
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const febDates = new Set(february.map((r) => r.date));
const rest = seed.filter((r) => !febDates.has(r.date));
const merged = [...rest, ...february].sort((a, b) => a.date.localeCompare(b.date));

writeFileSync(seedPath, JSON.stringify(merged, null, 2));
copyFileSync('data/february-2026.json', 'web/public/february-2026.json');
console.log('Merged', february.length, 'February rows (', merged.length, 'total)');
