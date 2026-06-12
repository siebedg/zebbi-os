import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const path = 'c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx';
const buf = readFileSync(path);
const wb = XLSX.read(buf, { cellStyles: true, cellDates: true, raw: false });
const ws = wb.Sheets['Daily log'];
const range = XLSX.utils.decode_range(ws['!ref']);

const headers = [];
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
  headers.push(cell?.v?.toString().trim() || `col${c}`);
}

const colorMap = {}; // col -> { color -> [values] }
const rows = [];

for (let r = 1; r <= range.e.r; r++) {
  const row = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    const h = headers[c - range.s.c] || `col${c}`;
    if (!cell) { row[h] = null; continue; }
    let v = cell.v;
    if (v instanceof Date) {
      if (h.toLowerCase().includes('date')) v = v.toISOString().slice(0, 10);
      else v = `${String(v.getHours()).padStart(2,'0')}:${String(v.getMinutes()).padStart(2,'0')}`;
    }
    const fill = cell.s?.fgColor?.rgb || cell.s?.fill?.fgColor?.rgb || 'none';
    row[h] = v === 'undefined' || v === '' ? null : v;
    if (fill !== 'none' && fill !== 'D9D9D9' && fill !== 'EFEFEF') {
      if (!colorMap[h]) colorMap[h] = {};
      if (!colorMap[h][fill]) colorMap[h][fill] = [];
      if (colorMap[h][fill].length < 5) colorMap[h][fill].push(v);
    }
  }
  if (row['Date']) rows.push(row);
}

console.log('Headers:', headers.filter(Boolean));
console.log('\nColor mappings (sample values per color):');
for (const [col, colors] of Object.entries(colorMap)) {
  console.log(`\n${col}:`);
  for (const [color, vals] of Object.entries(colors)) {
    console.log(`  #${color}: ${vals.join(', ')}`);
  }
}

// Stats for numeric columns
const numericCols = ['Sleep hours', 'Sleepscore', 'Meditation', 'Gratitude', 'Exercise', 'Avg Focus %', 'Total Deep Work (h)', 'Timetable'];
for (const col of numericCols) {
  const vals = rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
  if (vals.length) console.log(`${col}: min=${Math.min(...vals)}, max=${Math.max(...vals)}, n=${vals.length}`);
}

writeFileSync('data/daily-log.json', JSON.stringify(rows, null, 2));
console.log(`\nExported ${rows.length} rows to data/daily-log.json`);
