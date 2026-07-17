# Cloud sync (eenmalig)

## Upstash Redis koppelen

**Optie A (aanbevolen):** Vercel koppelt env vars automatisch

1. [zebbi-os → Storage](https://vercel.com/siebe-de-gelas-projects/zebbi-os/stores)
2. **Connect Store** → kies je bestaande Upstash **zebbi-os**
3. Redeploy

**Optie B:** handmatig uit Upstash console

1. Upstash → database **zebbi-os** → REST API → kopieer URL + token
2. Vercel → **zebbi-os** → Settings → Environment Variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `ZEEBI_PIN` (zelfde als in je lokale `.env`)
3. Redeploy

Lokaal: `.env` in repo-root (zie `.env.example`). Start met `npm run dev` vanuit de root — niet `npm run dev:web`.

**Controleren:** `GET https://zebbi-os.vercel.app/api/state` moet `"storage": "kv"` tonen (niet `"none"`).

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

## Whoop (slaap vanaf 4 juli 2026)

1. Maak een app op [developer.whoop.com](https://developer.whoop.com)
2. Redirect URI: `https://zebbi-os.vercel.app/api/whoop-callback`
3. Vercel → Environment Variables (Production + Preview):
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_REDIRECT_URI` = `https://zebbi-os.vercel.app/api/whoop-callback`
   - `WHOOP_SYNC_FROM` = `2026-07-04` (optioneel, dit is de default)
4. Redeploy
5. In Zebbi OS (Vandaag) → **Connect Whoop** → autoriseer → **Sync**

Wat wordt gesynct (alleen wake-dagen ≥ 4 jul):
- **wake time** op de ochtend-dag
- **bed time** op de vorige kalenderdag (Whoop-stijl; vóór 4 jul alleen als dat veld nog leeg is)
- **sleep score** = Whoop sleep performance %

Handmatig ingevulde dagen vóór 4 juli blijven staan.
