import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = 'c:\\Users\\siebe\\Downloads\\Approaches.xlsx';
const wb = XLSX.read(readFileSync(path), { cellStyles: true, cellDates: true });
const ws = wb.Sheets['Blad1'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

for (let r = 0; r < data.length; r++) {
  const row = data[r];
  if (row.some(c => c !== '')) {
    console.log(`R${r}:`, JSON.stringify(row));
  }
}
