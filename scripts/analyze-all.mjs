import XLSX from 'xlsx';
import { readFileSync } from 'fs';

function analyze(path, label) {
  const buf = readFileSync(path);
  const wb = XLSX.read(buf, { cellStyles: true, cellDates: true });
  console.log(`\n========== ${label} ==========`);
  console.log('Sheets:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = ws['!ref'] || 'A1';
    console.log(`\n--- ${name} --- ref: ${range}`);
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log('Rows:', data.length, 'Cols:', data[0]?.length);
    for (let r = 0; r < Math.min(8, data.length); r++) {
      console.log(`R${r}:`, JSON.stringify(data[r]?.slice(0, 25)));
    }
    if (data.length > 8) {
      console.log('...');
      for (let r = Math.max(8, data.length - 3); r < data.length; r++) {
        console.log(`R${r}:`, JSON.stringify(data[r]?.slice(0, 25)));
      }
    }
  }
}

analyze('c:\\Users\\siebe\\Downloads\\Data Visualization.xlsx', 'Data Visualization');
analyze('c:\\Users\\siebe\\Downloads\\Approaches.xlsx', 'Approaches');
