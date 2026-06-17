# Cloud sync (eenmalig)

Zebbi OS slaat alles op via `/api/state` (daglog, boeken, gewicht). Koppel **één** storage backend in Vercel:

1. Open [zebbi-os → Storage](https://vercel.com/siebe-de-gelas-projects/zebbi-os/stores)
2. **Create Database** → kies **Upstash Redis** (aanbevolen) of **Blob**
3. Koppel aan project **zebbi-os** → redeploy gebeurt automatisch

## PIN (aanbevolen)

Zonder PIN is de API open voor iedereen met de URL.

1. Vercel → Project **zebbi-os** → Settings → Environment Variables
2. Voeg toe: `ZEEBI_PIN` = jouw geheime code (bijv. 6 cijfers)
3. Redeploy

Bij eerste bezoek op laptop én telefoon: dezelfde PIN invoeren. De PIN zit **niet** in de app-build — alleen in je geheugen/sessie.

Legacy: `ZEEBI_SYNC_TOKEN` werkt nog als fallback voor `ZEEBI_PIN`.

## Controleren

- Indicator rechtsboven = **Sync** (groen) → cloud werkt
- **Offline** → storage niet gekoppeld of netwerkprobleem
- **PIN** → `ZEEBI_PIN` staat op Vercel maar je bent niet ingelogd

Data wordt elke ~45s en bij tab-focus opgehaald van de cloud.
