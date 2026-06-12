import XLSX from 'xlsx';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const VACATION_DATES = [
  '2026-02-20','2026-02-21','2026-02-22','2026-02-23',
  '2026-02-24','2026-02-25','2026-02-26','2026-02-27','2026-02-28',
];

function dateToISO(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  // Excel serial dates are UTC midnight; use UTC parts to avoid TZ drift (e.g. Feb 28 → Mar 1)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeFromDate(d) {
  if (!(d instanceof Date)) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseNum(v) {
  if (v == null || v === '' || v === 'undefined') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? undefined : n;
}

function parseBool(v) {
  if (v === 1 || v === '1' || v === true) return true;
  if (v === 0 || v === '0' || v === false) return false;
  return undefined;
}

function normalizeSleepScore(score, meditation) {
  if (score == null || isNaN(score)) return undefined;
  if (score <= 1) return score;
  if (score <= 100) {
    if (Number.isInteger(score) && score <= 25) {
      if (meditation != null && Math.abs(score - meditation) < 1.5) return undefined;
      if (score <= 20) return undefined;
    }
    return score / 100;
  }
  return undefined;
}

const dailyBuf = readFileSync('c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx');
const dailyWb = XLSX.read(dailyBuf, { cellDates: true });
const ws = dailyWb.Sheets['Daily log'];
const range = XLSX.utils.decode_range(ws['!ref']);
const dailyRows = [];

for (let r = 1; r <= range.e.r; r++) {
  const dateCell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
  const date = dateToISO(dateCell?.v);
  if (!date) continue;

  const get = (colName) => {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const h = ws[XLSX.utils.encode_cell({ r: 0, c })]?.v?.toString().trim();
      if (h === colName) return ws[XLSX.utils.encode_cell({ r, c })]?.v;
    }
  };

  const wake = get('Wake time') ?? get('Wake time ');
  const bed = get('Bed time');
  const meditation = parseNum(get('Meditation'));

  const row = {
    date,
    wakeTime: typeof wake === 'string' && /^\d{2}:\d{2}$/.test(wake) ? wake : timeFromDate(wake instanceof Date ? wake : undefined),
    bedTime: typeof bed === 'string' && /^\d{2}:\d{2}$/.test(bed) ? bed : timeFromDate(bed instanceof Date ? bed : undefined),
    sleepHours: parseNum(get('Sleep hours')),
    sleepScore:
      date >= '2026-01-01'
        ? normalizeSleepScore(parseNum(get('Sleepscore')), meditation)
        : undefined,
    meditation,
    gratitude: parseBool(get('Gratitude')),
    exercise: parseBool(get('Exercise')),
    avgFocus: parseNum(get('Avg Focus %')),
    deepWork1: parseNum(get('Deep work 1')),
    deepWork2: parseNum(get('Deep work 2')),
    deepWork3: parseNum(get('Deep work 3')),
    deepWork4: parseNum(get('Deep work 4')),
    deepWork5: parseNum(get('Deep work 5')),
    deepWork6: parseNum(get('Deep work 6')),
    totalDeepWork: parseNum(get('Total Deep Work (h)')),
    timetable: parseNum(get('Timetable')),
    dayType: VACATION_DATES.includes(date) ? 'vacation' : undefined,
  };
  dailyRows.push(row);
}

for (const d of VACATION_DATES) {
  if (!dailyRows.some((r) => r.date === d)) {
    dailyRows.push({ date: d, dayType: 'vacation' });
  }
}

dailyRows.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync('web/public/seed-daily-log.json', JSON.stringify(dailyRows, null, 2));

const bundledFiles = [
  'december-2025.json',
  'january-2026.json',
  'february-2026.json',
  'march-2026.json',
  'april-2026.json',
];
const bundled = bundledFiles.flatMap((f) => JSON.parse(readFileSync(`data/${f}`, 'utf8')));
const bundledDates = new Set(bundled.map((r) => r.date));
let merged = dailyRows.filter(
  (r) => !bundledDates.has(r.date) && r.date !== '2025-11-30',
);
merged = [...merged, ...bundled].sort((a, b) => a.date.localeCompare(b.date));
writeFileSync('web/public/seed-daily-log.json', JSON.stringify(merged, null, 2));
for (const f of bundledFiles) copyFileSync(`data/${f}`, `web/public/${f}`);
console.log('Daily:', merged.length, 'rows (bundled months patched)');
