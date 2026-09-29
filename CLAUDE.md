# Flights Near Home

Single-page Next.js (App Router) + TypeScript app that shows live aircraft within a radius of the user's home, using the OpenSky Network API.

## Commands
- `npm run dev` — dev server on http://localhost:3000
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build (run before calling a change done)

## Architecture
- `app/page.tsx` → `components/FlightTracker.tsx` (client) owns UI state: `selectedId` (pinned flight, by `icao24`) and `hoverId`.
- `hooks/useHome.ts` — home address + lat/lon, persisted in localStorage; defaults from `NEXT_PUBLIC_HOME_*`.
- `hooks/useFlights.ts` — polls `/api/flights` every 15s (slower when the tab is hidden).
- `app/api/flights/route.ts` — server proxy: OpenSky `/states/all` for the bounding box → filter to airborne aircraft inside the radius → enrich with route info → `Flight[]` sorted nearest first. Caches OpenSky results (30s with credentials, 180s anonymous) and serves stale data on errors/429s.
- `app/api/geocode/route.ts` — address → lat/lon via Nominatim (needs `NOMINATIM_USER_AGENT`).
- `lib/opensky.ts` — OpenSky client with OAuth2 client-credentials token caching. State vector field indexes are documented at https://openskynetwork.github.io/opensky-api/rest.html
- `lib/routes.ts` — callsign → airline + origin/destination via adsbdb (`https://api.adsbdb.com/v0/callsign/{callsign}`), cached 12h in memory. OpenSky live data has no origin/destination, which is why this exists.
- `lib/airlines.ts` — ICAO prefix → IATA/name/badge color fallback table.
- `components/RadarMap.tsx` — stylized radar map (no map tiles). Positions are projected equirectangularly around home (`lib/geo.ts#offsetMi`) and scaled so the radius fits the panel.
- `components/FlightList.tsx` — scrollable list; pinned flight first, then nearest.

## Behavior that must hold
- Hovering a plane on the map (or a row) highlights both; the map shows a tooltip.
- Clicking a plane or a row pins it: it moves to the top of the list, turns amber, and expands to show altitude/speed/heading. Clicking again unpins.
- "Edit address" opens an inline form (Enter saves, Esc cancels) that geocodes and recenters the map.

## Design rules (from the design canvas)
- All colors are CSS variables in `app/globals.css` `:root`. Use them; don't add raw hex in components.
- Chrome is neutral charcoal (`--bg`, `--panel`, `--row`); navy is used **only** inside the map. Amber (`--amber`) marks home and the pinned flight only. Plane icons are `--sky`.
- Fonts: Sora (display), IBM Plex Sans (body), IBM Plex Mono (flight numbers, figures) via `next/font/google`.
- Touch targets ≥ 44px, real `<button>`s, visible `:focus-visible` rings.

## External API limits
- OpenSky: daily credit budget (anonymous is small; an API client gets more). Don't poll OpenSky directly from the browser and don't lower the server cache TTL without checking the budget.
- Nominatim: ≤ 1 request/second, identifying User-Agent required.
- Airline logos load from `https://pics.avs.io/88/88/{IATA}.png` and fall back to a colored code tile.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
