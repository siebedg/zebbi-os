import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = 'c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx';
const buf = readFileSync(path);
const wb = XLSX.read(buf, { cellStyles: true, cellDates: true });

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\n=== ${name} === range: ${ws['!ref']}`);
  
  // Print first 3 rows with all columns
  for (let r = range.s.r; r <= Math.min(range.s.r + 2, range.e.r); r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) { row.push(''); continue; }
      const fill = cell.s?.fgColor?.rgb || cell.s?.fill?.fgColor?.rgb || '';
      row.push(`${cell.v}${fill ? `[#${fill}]` : ''}`);
    }
    console.log(`Row ${r}:`, JSON.stringify(row));
  }
  
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Total rows: ${data.length}, cols: ${data[0]?.length || 0}`);
  if (data[0]) console.log('Headers:', data[0]);
  if (data[1]) console.log('Sample row 1:', data[1]);
}
