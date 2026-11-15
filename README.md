# HelpMe

Emergency medical help for India — SOS, blood, hospitals, pharmacies, ambulances, voice helper.

Mission brief: [`docs/MISSION.md`](docs/MISSION.md)  
Design source: [`design-reference/`](design-reference/)


## Voice: Gnani AI (Prisma + Timbre)

Every voice interaction runs through Gnani:

```
mic (16 kHz WAV) -> POST /api/voice/stt -> Gnani Prisma v3.0 (hi-IN,en-IN, Hinglish-friendly)
  -> intent parser (EN / Hindi / Hinglish) -> map filter, route, blood search, ambulance, SOS
  -> POST /api/voice/tts -> Gnani Timbre v2.5 (Nalini hi-IN / Devika en-IN / Poorvi Hinglish) -> speaker
```

- Keys live only in `.env` on the server (`GNANI_API_KEY`). The browser never sees them.
- Get a key: https://app.gnani.ai/voice  ·  Docs: https://docs.gnani.ai
- Test your key: `cd server && node scripts/test-gnani.mjs`
- Without a key the app falls back to the browser's Web Speech API (dev only).

Try saying: "Nearest hospital", "B+ blood chahiye, 2 units", "ambulance bulao", "मुझे पास का अस्पताल दिखाओ", "Hindi mein bolo".

Files: `server/src/routes/voice.ts`, `src/services/voice/{voiceService,recorder,intent}.ts`, `src/hooks/useVoiceCommand.ts`.

## Stack

**Frontend:** React · TypeScript · Vite · Tailwind v4 · React Router · Zustand · Framer Motion · Lucide · react-i18next · MapLibre (Esri streets) · optional Mapbox Directions  

**Backend:** Node · Express · TypeScript · Postgres/PostGIS (optional; in-memory store without `DATABASE_URL`) · OpenStreetMap Overpass

## Setup

```bash
npm install
npm install --prefix server
cp .env.example .env
```

### Run (two terminals)

```bash
npm run dev:server   # API on :3001
npm run dev          # UI on :5173 (proxies /api → :3001)
```

Optional PostGIS:

```bash
npm run db:up
# set DATABASE_URL=postgresql://helpme:helpme@localhost:5432/helpme
```

### Tests

```bash
npm run test:server   # OSM normalizer + recorded Overpass fixture (no live calls)
```

## Data sources

| Source | What | Notes |
|--------|------|--------|
| **OpenStreetMap / Overpass** | Hospitals, clinics, doctors, pharmacies, ambulance stations, blood banks, NGOs | Primary. Cached by area (~10 km). Refresh every `PLACES_REFRESH_DAYS` (default 7). Never called from the browser. |
| **Mappls** | Phone / hours enrichment | Adapter stub. `ENABLE_MAPPLS=false` until configured. |
| **Google Places (New)** | Optional enrichment | Adapter stub. `ENABLE_GOOGLE=false`. Check terms before mixing with non-Google maps. |
| **data.gov.in / NGO Darpan** | Batch CSV import | See `scripts/import-static.md`. Not live per request. |
| **ABDM HFR** | Facility registry | Stub only until sandbox approval. |
| **Registered providers** | Ambulance / NGO / doctor | `POST /api/register/*` → pending → `/admin` approve. |
| **Demo donors** | ~12 donors around user | Deterministic per area. Labeled **Demo donor**. Not real people. |
| **Request progress** | Searching → … → Handover | Simulated and labeled. |

### Honesty rules

- Missing phone → hide Call, show “Phone not available”.
- Missing hours → “Hours not listed”; never invent “Open now”.
- OSM places show **Unverified**; registered/approved show **Verified**.
- Map always shows **© OpenStreetMap contributors** (ODbL).
- Offline (API down): banner “Offline, showing limited data”.

### Rural widening

If fewer than 3 results in 5 km, API widens to 15 km then 30 km and sets `meta.widened` / message.

### Overpass connectivity

Public Overpass mirrors are rate-limited and sometimes unreachable. The server rotates mirrors, backs off on 429/504, and cools down 5 minutes after a failed pull. Probe with `node scripts/probe-overpass.mjs`. When Overpass is down, the API still responds (empty/cached) and the UI shows the finding/offline banners — it never invents places.

## API (frontend only talks here)

- `GET /api/places?kind=&lat=&lng=&radius=&openNow=`
- `GET /api/places/:id`
- `POST /api/places/:id/report`
- `POST /api/register/ambulance|ngo|doctor`
- `GET /api/emergency-numbers`
- `GET /api/ambulances/nearby`
- `POST /api/ambulances/:id/location` (driver)
- `GET /api/stream/requests/:id` (SSE)
- `GET/POST /api/admin/registrations…`

## Driver live GPS

Open `/driver`, enter ambulance code, **Go online**. Posts location every ~3–5s. Requester can subscribe via SSE.

## Scripts

- `npm run dev` — frontend
- `npm run dev:server` — API
- `npm run build` — production UI
- `npm run test:server` — normalizer tests
- `npm run db:up` — PostGIS via Docker
