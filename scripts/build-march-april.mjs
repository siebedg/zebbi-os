import { writeFileSync } from 'fs'

const marchRows = `March 1	6:00 AM	9:56 PM	7.93	89%	10	0	1								
March 2	6:00 AM	9:56 PM	8.03	91%	10	1	0	81.67	2.00	1.33	1			4.33	59.25
March 3	6:00 AM	9:40 PM	7.98	90%	15	1	1	85	2.00	1.50	1			4.50	64.50
March 4	6:00 AM	9:30 PM	8.3	91%	10	1	1	80	2.00	1.50	1			4.50	92.25
March 5	6:00 AM	10:40 PM	8.28	91%	14	1	0	88.33	2.00	1.50	1.63			5.13	63.50
March 6	6:00 AM	9:25 PM	7.27	86%	13	1	1	85	2.13	Infosessies				2.13	56.00
March 7	6:00 AM	10:16 PM	8.52	93%	15	0	0	80	2.00	1.50	1.17			4.67	73.00
March 8	6:45 AM	9:10 PM	8.47	89%	7.5	0	1								
March 9	6:00 AM	10:00 PM	8.78	89%	13	0	0	87.50	2.00	1.50	1.13	1.13		5.76	75.75
March 10	6:00 AM	10:04 PM	7.95	93%	11	1	0	65	2.00			Topper 		2.00	42.00
March 11	6:00 AM	10:33 PM	7.88	93%	7.5	1	1	95	2.00					2.00	53.25
March 12	6:00 AM	9:53 PM	7.22	88%	7.5	1	0	80	2.00	1.25				3.25	71.25
March 13	6:00 AM	9:35 PM	8.07	91%	7.5	1	1	87.5	2.00	1.50	1.50	0.25		5.25	87.00
March 14	6:00 AM	11:26 PM	8.38	92%	9.5	0	1	85	2.00	1.33				3.33	57.75
March 15	9:09 AM	10:01 PM	9.72	79%	1	0	0								
March 16	6:15 AM	10:03 PM	7.93	83%	10	0	0	80.00	2.00	1.50	1.33			4.83	67.00
March 17	6:15 AM	9:35 PM	8.18	89%	12	1	1	83.33	2.00	1.25	1.00			4.25	67.25
March 18	6:00 AM	9:45 PM	8.28	87%	12.5	0	0	81.67	2.00	1.50	1.62			5.12	87.75
March 19	6:00 AM	9:21 PM	8.18	93%	13	1	0	81.67	2.00	1.50	1.53			5.03	80.50
March 20	6:00 AM	9:50 PM	8.57	97%	14	1	0	86.67	2.00	1.37	1.57			4.94	74.00
March 21	6:00 AM	11:01 PM	8.12	93%	11.5	0	1	67.5	2.00	1.62				3.62	63.25
March 22	6:30 AM	9:32 PM	7.45	83%	8.5	1	0								
March 23	6:00 AM	9:41 PM	8.4	89%	8.5	1	0	87.5	2.00	1.50	1.22	0.6		5.32	91.00
March 24	6:00 AM	9:44 PM	8.25	92%	8.5	0	1	80	2.00	1.50	1.25			4.75	67.00
March 25	6:00 AM	10:39 PM	8.2	91%	8	0	0	81.67	2.00	4.05	2.05			8.10	69.25
March 26	6:00 AM	10:19 PM	7.28	87%	12	0	1	76.67	2.00	1.97	0.62			4.59	63.00
March 27	6:00 AM	12:18 PM	7.6	89%	11	0	0	83.33	2.00	1.47	1.10			4.57	56.50
March 28	6:45 AM	8:49 PM	6.78	79%	12.5	0	0								
March 29	8:50 AM	9:32 PM	11.03	83%	7.5	1	0								
March 30	6:00 AM	9:20 PM	8.45	82%	8.5	1	0	80	2.00	0.58	1.50			4.08	80.75
March 31	6:00 AM	9:47 PM	8.58	83%	11	1	1	86.7	2.00	1.25	1.25			4.50	89.50`

const aprilRows = `April 1	6:00 AM	11:11 PM	8.17	89%	10	0	1	90	2.00	1.32	1.30			4.62	52.75
April 2															
April 3															
April 4															
April 5	8:04 AM	10:48 PM	9.52	95%	3	1	1								
April 6	6:00 AM	11:18 PM	7.12	83%	8	1	0	88.33	2.00	1.50	2.57			6.07	74.25
April 7	6:00 AM	10:41 PM	6.87	82%	7.5	1	0	78.33	2.00	1.35	1.00			4.35	71.75
April 8	6:00 AM	10:09 PM	7.27	83%	10	1	1	83.33	1.98	1.50	1.50			4.98	75.00
April 9	8:00 AM	10:16 PM	9.85	84%	7.5	1	0	70.00	1.40	2.05				3.45	38.00
April 10	6:40 AM	9:32 PM	8.33	89%	7.5	1	1	81.67	2.00	1.30	1.33			4.63	69.25
April 11	6:00 AM	10:29 PM	8.4	87%	10	1	0	85	2.00	1.50	1.15			4.65	70.50
April 12	6:00 AM	9:36 PM	7.4	87%	10	1	1								
April 13	6:00 AM	10:49 PM	8.27	89%	10	1	1	78.33	2.00	1.50	1.00			4.50	71.25
April 14	8:30 AM	10:54 PM	9.73	83%	1	0	1	80	2.00	1.33	1.00			4.33	74.80
April 15	6:10 AM	9:33 PM	7.02	85%	10	1	1	80	2.00	1.50	1.02			4.52	81.00
April 16	6:00 AM	9:38 PM	8.35	85%	11	1	0	78.33	2.00	1.25	1.63			4.88	67.50
April 17	6:00 AM	10:53 PM	8.3	90%	7.5	1	0	81.67	2.00	1.50	1.60			5.10	79.50
April 18	6:00 AM	12:27 AM	7	86%	7.5	0	0								
April 19	8:19 AM	9:40 PM	7.87	78%	10	0	1								
April 20	6:00 AM	9:43 PM	8.27	81%	13	1	1	86.67	2.00	1.50	1.10			4.60	91.50
April 21	6:00 AM	10:54 PM	8.22	87%	10	0	1	81.67	2.00	1.50	1.30			4.80	80.25
April 22															
April 23															
April 24								Bought my Kia Rio today. So fucking grateful. Life is good, life is great.							
April 25															
April 26															
April 27															
April 28															
April 29															
April 30`

function parseTime12(s) {
  if (!s) return undefined
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return undefined
  let h = parseInt(m[1], 10)
  const min = m[2]
  const ap = m[3].toUpperCase()
  if (ap === 'AM' && h === 12) h = 0
  if (ap === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${min}`
}

function num(s) {
  if (s == null || !String(s).trim()) return undefined
  const n = parseFloat(String(s).replace(',', '.').replace('%', ''))
  return Number.isNaN(n) ? undefined : n
}

function parseRows(raw, month) {
  return raw
    .split('\n')
    .map((line) => {
      const parts = line.split('\t')
      const day = parseInt(parts[0].replace(/\D/g, ''), 10)
      const date = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const entry = { date }
      const noteParts = []

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
      const focusRaw = parts[8]?.trim()
      const focus = num(focusRaw)
      if (focus != null) entry.avgFocus = focus
      else if (focusRaw) noteParts.push(focusRaw)

      for (let i = 0; i < 5; i++) {
        const rawDw = parts[9 + i]
        const v = num(rawDw)
        if (v != null) entry[`deepWork${i + 1}`] = v
        else if (rawDw && String(rawDw).trim()) noteParts.push(String(rawDw).trim())
      }

      const tot = num(parts[14])
      if (tot != null) entry.totalDeepWork = tot
      const tt = num(parts[15])
      if (tt != null) entry.timetable = tt

      for (let i = 16; i < parts.length; i++) {
        const t = parts[i]?.trim()
        if (t) noteParts.push(t)
      }

      if (noteParts.length) entry.notes = noteParts.join(' · ')

      const hasData =
        entry.wakeTime ||
        entry.bedTime ||
        entry.sleepHours != null ||
        entry.meditation != null ||
        entry.gratitude != null ||
        entry.exercise != null ||
        entry.avgFocus != null ||
        entry.totalDeepWork != null ||
        entry.timetable != null ||
        entry.notes
      return hasData ? entry : null
    })
    .filter(Boolean)
}

const march = parseRows(marchRows, 3)
const april = parseRows(aprilRows, 4)

writeFileSync('data/march-2026.json', JSON.stringify(march, null, 2) + '\n')
writeFileSync('data/april-2026.json', JSON.stringify(april, null, 2) + '\n')
console.log('Wrote', march.length, 'March and', april.length, 'April rows')
