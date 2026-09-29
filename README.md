# OrbitWatch

Somaiya-themed live space-object tracker. A 3D globe shows **active satellites**, **constellation shells** (Starlink), and **orbital debris**, propagated in the browser from real GP/TLE data. The Express backend is an API gateway that caches CelesTrak, Space-Track, NOAA SWPC, and Launch Library 2 so credentials and rate limits stay off the client.

BeliefSat-0 (K. J. Somaiya Institute of Technology / New Leap Labs, PSLV-C58 POEM, Jan 2024) is the featured mission. It decayed in March 2024, so live tracking is historical only — the app explains that and offers active LEO analogs (stations / amateur radio sats).

## Stack

| Layer | Tech |
| --- | --- |
| Client | Vite, React 18, Resium/Cesium, satellite.js (SGP4), TanStack Query, Tailwind |
| Server | Express, node-cron, disk+memory cache |
| Data | CelesTrak GP, Space-Track (optional), NOAA SWPC, Launch Library 2 |

## Prerequisites

- Node.js 18.18+
- Optional: [Space-Track.org](https://www.space-track.org/) account (debris catalog with object type / RCS)
- Optional: [Cesium ion](https://ion.cesium.com/tokens) token (not required — the globe uses Esri World Imagery + ellipsoid terrain by default)
- Launch Library 2 needs no key; production is limited to **15 requests/hour** — OrbitWatch caches it

## Setup

```bash
npm install
```

Copy environment files:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

Edit `server/.env`:

- `SPACE_TRACK_USER` / `SPACE_TRACK_PASSWORD` — leave blank to use CelesTrak debris fallbacks
- `LL2_MODE=dev` during development (lldev sample data); `prod` for live launches

Edit `client/.env`:

- `VITE_CESIUM_ION_TOKEN` — optional

## Run

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3001 (`/api/health`)

Vite proxies `/api` to the Express server.

## Tests

```bash
npm test
```

Covers the NOAA dual-format parser and GP catalog normalizer.

## Rate limits (please respect them)

| Source | Guidance |
| --- | --- |
| CelesTrak | Fetch groups from the **server**, cache 4–6h, do not scrape from the browser |
| Space-Track | Server-only session; bulk GP ~ once per several hours; persisted to disk |
| NOAA SWPC | Cached 5–15 minutes |
| Launch Library 2 (prod) | 15 req/h — cached 30 minutes |

## Demo script

1. Open the globe. Stations load by default (ISS and crew vehicles).
2. Toggle **Starlink** (capped) to see a constellation shell; watch the altitude histogram.
3. Toggle **Debris** (CelesTrak fallback or Space-Track if credentials are set).
4. Search `25544` or `ISS` — fly-to, orbit path, inspector (lat/lon/alt, epoch age).
5. Scrub time ±90 minutes to see SGP4 propagation vs live clock.
6. Open **BeliefSat-0** — timeline, decay note, **Show similar active objects**.
7. Space weather drawer: Kp / G-scale and amateur-radio context.
8. Launches sidebar: upcoming flights, **India / ISRO** chip, PSLV-C58 tie-in.

## API (selected)

- `GET /api/health`
- `GET /api/catalog/groups`
- `GET /api/catalog/objects?group=stations&limit=400`
- `GET /api/catalog/object/:noradId`
- `GET /api/debris/sample?limit=1500`
- `GET /api/space-weather/current`
- `GET /api/launches/upcoming?limit=10`
- `GET /api/missions/beliefsat`
