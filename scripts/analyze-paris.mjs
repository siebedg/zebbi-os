import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = 'c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx';
const wb = XLSX.read(readFileSync(path), { cellStyles: true, cellDates: true });
const ws = wb.Sheets['Daily log'];
const range = XLSX.utils.decode_range(ws['!ref']);

function getCell(r, c) {
  return ws[XLSX.utils.encode_cell({ r, c })];
}

function dateStr(cell) {
  if (!cell?.v) return null;
  if (cell.v instanceof Date) {
    const y = cell.v.getFullYear();
    const m = String(cell.v.getMonth()+1).padStart(2,'0');
    const d = String(cell.v.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  return String(cell.v).slice(0, 30);
}

function fill(cell) {
  return cell?.s?.fgColor?.rgb || cell?.s?.fill?.fgColor?.rgb || '';
}

// col 6 = Date based on earlier analysis
for (let r = 1; r <= range.e.r; r++) {
  const dateCell = getCell(r, 6);
  const ds = dateStr(dateCell);
  if (!ds) continue;
  if (ds.includes('2025-12') || ds.includes('2026-01') || ds.includes('2026-02') || /paris|feb/i.test(ds)) {
    const score = getCell(r, 10)?.v;
    const scoreFill = fill(getCell(r, 10));
    const dateFill = fill(dateCell);
    const rowFills = new Set();
    for (let c = 5; c <= 22; c++) {
      const f = fill(getCell(r, c));
      if (f && f !== 'EFEFEF' && f !== 'D9D9D9') rowFills.add(f);
    }
    if (rowFills.size || /2026-02-2[4-8]/.test(ds) || /2025-12-0[1-9]/.test(ds)) {
      console.log(r, ds, 'score=', score, 'dateFill=#'+dateFill, 'fills=', [...rowFills].map(f=>'#'+f).join(','));
    }
  }
}
