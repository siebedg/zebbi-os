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

// Find Paris rows and colors
for (let r = 1; r <= range.e.r; r++) {
  const dateCell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
  const rowText = [];
  let hasParis = false;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell?.v) continue;
    const v = String(cell.v);
    if (/paris|vacation|feb.*24|rest day|RIJBEWIJS/i.test(v)) hasParis = true;
    const fill = cell.s?.fgColor?.rgb || cell.s?.fill?.fgColor?.rgb || '';
    if (fill && fill !== 'D9D9D9' && fill !== 'EFEFEF') {
      rowText.push(`${headers[c-range.s.c]}=${v}[#${fill}]`);
    }
  }
  if (hasParis || rowText.some(t => t.includes('PARIS'))) {
    const d = dateCell?.v;
    console.log(`Row ${r} date=${d instanceof Date ? d.toISOString().slice(0,10) : d}:`, rowText.slice(0,8).join(' | '));
  }
}

// Sleep score distribution early Dec
console.log('\n--- Early Dec sleep scores ---');
for (let r = 1; r <= 40; r++) {
  const dateCell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
  const scoreCell = ws[XLSX.utils.encode_cell({ r, c: 10 })]; // Sleepscore col?
  if (!dateCell?.v) continue;
  const d = dateCell.v instanceof Date ? dateCell.v.toISOString().slice(0,10) : dateCell.v;
  const score = scoreCell?.v;
  const fill = scoreCell?.s?.fgColor?.rgb || '';
  if (score != null && score !== '') console.log(d, 'score=', score, fill ? `#${fill}` : '');
}

// Find all unique row-level background colors for date cells in Feb
console.log('\n--- Feb 2026 row colors ---');
for (let r = 1; r <= range.e.r; r++) {
  const dateCell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
  if (!dateCell?.v instanceof Date) continue;
  const d = dateCell.v.toISOString().slice(0,10);
  if (!d.startsWith('2026-02')) continue;
  const fills = new Set();
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    const fill = cell?.s?.fgColor?.rgb || cell?.s?.fill?.fgColor?.rgb;
    if (fill && fill !== 'EFEFEF' && fill !== 'D9D9D9') fills.add(fill);
  }
  if (fills.size) console.log(d, [...fills].map(f=>'#'+f).join(', '));
}
