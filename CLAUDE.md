# Flights Near Home

Single-page Next.js (App Router) + TypeScript app that shows live aircraft within a radius of the user's home, using live ADS-B data from adsb.lol. Deployed on Vercel.

## Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build (run before calling a change done)

## Architecture

- `app/page.tsx` → `components/FlightTracker.tsx` (client) owns UI state: `selectedId` (pinned flight, by `icao24`) and `hoverId`.
- `hooks/useHome.ts` — home address + lat/lon, persisted in localStorage; defaults from `NEXT_PUBLIC_HOME_*`.
- `hooks/useFlights.ts` — polls `/api/flights` every 15s (slower when the tab is hidden).
- `app/api/flights/route.ts` — server proxy: adsb.lol `/v2/point` for the radius → filter to airborne aircraft inside the radius → enrich with route info → `Flight[]` sorted nearest first. Caches adsb.lol results for 15s and serves stale data on errors/429s.
- `app/api/geocode/route.ts` — address → lat/lon via Nominatim (needs `NOMINATIM_USER_AGENT`).
- `lib/adsb.ts` — adsb.lol client (no key). Response is readsb `aircraft.json` format (ft, kt, ft/min; `alt_baro: "ground"` when on the ground). Docs: https://api.adsb.lol/docs
- `lib/routes.ts` — callsign → airline + origin/destination via adsbdb (`https://api.adsbdb.com/v0/callsign/{callsign}`), cached 12h in memory. Live ADS-B data has no origin/destination, which is why this exists. adsbdb matches on callsign only, so its route can be stale (NetJets, charters, reused flight numbers); `routeFits` in the flights route removes any flight whose route it isn't plausibly flying (near an endpoint, or on the great-circle path between them); flights with no route at all are still shown.
- `lib/tiles.ts` — Esri World Dark Gray raster tiles (base + labels, keyless) laid out at the radar's scale.
- `lib/airlines.ts` — ICAO prefix → IATA/name/badge color fallback table.
- `components/RadarMap.tsx` — radar map over dimmed street tiles. Positions are projected equirectangularly around home (`lib/geo.ts#offsetMi`) and scaled so the radius fits the panel.
- `components/FlightList.tsx` — scrollable list; pinned flight first, then nearest.

## Behavior that must hold

- Hovering a plane on the map (or a row) highlights both; the map shows a tooltip.
- Clicking a plane or a row pins it: it moves to the top of the list, turns amber, and expands to show altitude/speed/heading. Clicking again unpins.
- The map pans by dragging and zooms with the wheel/trackpad, pinch, or the +/− buttons; the crosshair button recenters on home. A drag that starts on a plane must not pin it. Changing home or radius resets the view.
- "Edit address" opens an inline form (Enter saves, Esc cancels) that geocodes and recenters the map.

## Design rules (from the design canvas)

- All colors are CSS variables in `app/globals.css` `:root`. Use them; don't add raw hex in components.
- Chrome is neutral charcoal (`--bg`, `--panel`, `--row`); navy is used **only** inside the map. Amber (`--amber`) marks home and the pinned flight only. Plane icons are `--sky`.
- Fonts: Sora (display), IBM Plex Sans (body), IBM Plex Mono (flight numbers, figures) via `next/font/google`.
- Touch targets ≥ 44px, real `<button>`s, visible `:focus-visible` rings.

## External API limits

- adsb.lol: free and volunteer-run; rate limits are dynamic. Don't poll it directly from the browser or lower the 15s server cache.
- Don't switch back to OpenSky: it blocks cloud/hosting IPs (including Vercel), even with OAuth credentials.
- Nominatim: ≤ 1 request/second, identifying User-Agent required.
- Airline logos load from `https://pics.avs.io/88/88/{IATA}.png` and fall back to a colored code tile.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
