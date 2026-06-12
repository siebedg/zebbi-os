import { writeFileSync } from 'fs'

const rows = `January 1	6:00 AM	9:35 PM	8.18	89%	14	0	0	76	2.00					2.00	19.70
January 2	6:00 AM	9:39 PM	8.37	90%	15	0	0	80	2.00	1.50	1.50	1.63	0.87	7.50	54.50
January 3	6:00 AM	10:03 PM	8.25	94%	15	0	0	76	2.53	0.92				3.45	49.50
January 4	6:00 AM	9:27 PM	7.87	82%	15	0	0	85	2.07	1.00	0.57	2.00		5.64	62.50
January 5	6:00 AM	9:48 PM	8.42	82%	15	0	0								
January 6	6:00 AM	9:32 PM	8.1	90%	15	1	1	89	1.78	1.55	1.70			5.03	58.00
January 7	6:00 AM	9:35 PM	8.38	94%	8	1	0	76	2.35	2.07	0.27			4.69	36.75
January 8	6:00 AM	10:03 PM	8.33	96%	14	1	0	76	1.23	0.72	1.85	2.00		5.80	41.25
January 9	6:00 AM	9:36 PM	7.88	92%	14	1	0	74	1.03	1.00	0.58	0.50	0.50	3.61	52.50
January 10	6:00 AM	10:00 PM	8.3	94%	10	1	0	65	1.92	1.33				3.25	68.00
January 11	6:00 AM	10:00 PM	7.88	93%	11	1	0	76.7	1.93	1.50	1.42			4.85	63.00
January 12	6:00 AM	9:11 PM	7.87	87%	5	1	0								
January 13	6:00 AM	9:26 PM	8.72	92%	11	1	0	77.5	2.22	1.42				3.64	50.25
January 14	6:00 AM	10:14 PM	8.50	95%	14	1	0	76.25	2.00	1.75	0.50	1.92		6.17	46.75
January 15	6:00 AM	9:33 PM	7.7	90%	11	1	1	73.75	1.50	1.50	1.50	1.00		5.50	96.00
January 16	6:00 AM	9:44 PM	8.38	93%	11	1	1	72.5	1.50	1.50	1.50	1.00		5.50	86.50
January 17	6:00 AM	10:10 PM	8.17	97%	15	1	1	70	1.50	1.50	1.50			4.50	62.25
January 18	6:00 AM	10:14 PM	7.73	94%	12	1	1	57.5	1.50	0.50				2.00	40,25
January 19	6:00 AM	10:44 PM	7.67	91%	12	1	1								
January 20	6:00 AM	11:30 PM	7.23	89%	12	0	0	88.3	2.00	1.00	1.33			4.33	52.75
January 21	6:00 AM	11:07 PM	6.43	84%	12	0	0	67.5	2.00	1.08				3.08	34.00
January 22	6:00 AM	9:54 PM	6.83	84%	11	1	0	62.5	2.00	1.50				3.50	43.00
January 23	6:00 AM	10:52 PM	7.98	87%	13	1	1	88.3	2.00	1.50	1.50			5.00	81.00
January 24	6:00 AM	10:57 PM	7.05	86%	13	0	1	76.7	2.00	1.50	1.50			5.00	73.50
January 25	6:00 AM	9:29 PM	6.92	87%	12	0	0	95	2.00					2.00	26.50
January 26	7:00 AM	11:15 PM	9.52	87%	11	0	0								
January 27	6:40 AM	10:56 PM	7.38	87%	11	0	0								
January 28	6:00 AM	10:58 PM	6.95	85%	6	0	0								
January 29	6:00 AM	10:35 PM	6.95	83%	10	1	0								
January 30	6:00 AM	10:30 PM	7.25	85%	15	0	0								
January 31	6:00 AM	10:55 PM	7.48	87%	6	1	1`

function parseTime12(s) {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return undefined
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  if (ap === 'AM' && h === 12) h = 0
  if (ap === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${min}`
}

function num(s) {
  if (!s || !String(s).trim()) return undefined
  const n = parseFloat(String(s).replace(',', '.').replace('%', ''))
  return Number.isNaN(n) ? undefined : n
}

const entries = rows.split('\n').map((line) => {
  const parts = line.split('\t')
  const day = parseInt(parts[0].replace(/\D/g, ''), 10)
  const date = `2026-01-${String(day).padStart(2, '0')}`
  const entry = { date }
  const wake = parseTime12(parts[1])
  const bed = parseTime12(parts[2])
  if (wake) entry.wakeTime = wake
  if (bed) entry.bedTime = bed
  const sleepHours = num(parts[3])
  if (sleepHours != null) entry.sleepHours = sleepHours
  const score = num(parts[4])
  if (score != null) entry.sleepScore = score / 100
  const med = num(parts[5])
  if (med != null) entry.meditation = med
  const gr = num(parts[6])
  if (gr != null) entry.gratitude = gr === 1
  const ex = num(parts[7])
  if (ex != null) entry.exercise = ex === 1
  const focus = num(parts[8])
  if (focus != null) entry.avgFocus = focus
  for (let i = 0; i < 5; i++) {
    const v = num(parts[9 + i])
    if (v != null) entry[`deepWork${i + 1}`] = v
  }
  const tot = num(parts[14])
  if (tot != null) entry.totalDeepWork = tot
  const tt = num(parts[15])
  if (tt != null) entry.timetable = tt
  return entry
})

writeFileSync('data/january-2026.json', JSON.stringify(entries, null, 2) + '\n')
console.log('Wrote', entries.length, 'January 2026 rows')
