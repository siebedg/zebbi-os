# Zebbi OS

Persoonlijk dashboard voor slaap, habits en deep work — maandoverzicht, grafieken en dagelijkse log.

## Starten

```bash
cd web
npm install
npm run dev
```

Open de URL uit de terminal (meestal `http://localhost:5173`).

## Functies

- **Vandaag** — slaap, habits, deep work sessies, rustdagen
- **Maand** — volledig maandrooster (dec 2025+)
- **Grafieken** — trends over tijd

## Deep work plakken

Elk blok (gescheiden door een lege regel) = één sessie (DW1, DW2, …):

```
8:00 --> 9:30
85%


10:43 --> 11:43
55%
```

## Data

Maandbundels staan in `data/` en `web/public/` (december 2025 t/m april 2026). Bij laden worden ze gemerged met localStorage.

## Scripts

```bash
node scripts/rebuild-bundled-data.mjs   # maanden herbouwen uit bundled-source.tsv
node scripts/patch-rest-days.mjs        # rustdagen markeren
```
