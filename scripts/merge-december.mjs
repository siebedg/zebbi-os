import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const december = JSON.parse(readFileSync('data/december-2025.json', 'utf8'));
const seedPath = 'web/public/seed-daily-log.json';
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const decDates = new Set(december.map((r) => r.date));
const rest = seed.filter((r) => !decDates.has(r.date) && r.date !== '2025-11-30');
const merged = [...rest, ...december].sort((a, b) => a.date.localeCompare(b.date));

writeFileSync(seedPath, JSON.stringify(merged, null, 2));
copyFileSync('data/december-2025.json', 'web/public/december-2025.json');
console.log('Merged', december.length, 'December rows into seed (', merged.length, 'total)');
