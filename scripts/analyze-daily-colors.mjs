import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = 'c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx';
const wb = XLSX.read(readFileSync(path), { cellStyles: true, cellDates: true });
const ws = wb.Sheets['Daily log'];
const range = XLSX.utils.decode_range(ws['!ref']);

const headers = [];
for (let c = range.s.c; c <= range.e.c; c++) {
  const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
  headers.push(cell?.v?.toString().trim() || `col${c}`);
}
console.log('Headers:', headers);

// Sample row with colors
for (let r = 1; r <= 10; r++) {
  const parts = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) continue;
    const h = headers[c - range.s.c];
    const fill = cell.s?.fgColor?.rgb || cell.s?.fill?.fgColor?.rgb || '';
    if (h && cell.v !== '' && cell.v !== undefined) {
      parts.push(`${h}=${cell.v}${fill ? `[#${fill}]` : ''}`);
    }
  }
  if (parts.length) console.log(`Row ${r}:`, parts.join(' | '));
}

// Date range
const dates = [];
for (let r = 1; r < range.e.r - 2; r++) {
  const cell = ws[XLSX.utils.encode_cell({ r, c: 6 })]; // Date col
  if (cell?.v instanceof Date) dates.push(cell.v.toISOString().slice(0,10));
}
console.log('\nDate range:', dates[0], '->', dates[dates.length-1], 'count:', dates.length);
