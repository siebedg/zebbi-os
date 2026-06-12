# Cloud sync (eenmalig)

Zebbi OS slaat je daglog op via `/api/state`. Koppel **één** storage backend in Vercel:

1. Open [zebbi-os → Storage](https://vercel.com/siebe-de-gelas-projects/zebbi-os/stores)
2. **Create Database** → kies **Upstash Redis** (aanbevolen) of **Blob**
3. Koppel aan project **zebbi-os** → redeploy gebeurt automatisch

Optioneel (aanbevolen voor productie):

- `ZEEBI_SYNC_TOKEN` — server secret voor PUT/GET
- `VITE_ZEEBI_SYNC_TOKEN` — dezelfde waarde (client build)

Zonder token is de API open; prima voor persoonlijk gebruik, minder ideaal op een publieke repo.

Na storage-koppeling: refresh de app → indicator rechtsboven wordt **Sync** (groen).
