import { NextResponse, type NextRequest } from "next/server";
import { airlineFromCallsign, displayFlightNumber } from "@/lib/airlines";
import { boundingBox, haversineMi } from "@/lib/geo";
import { getStates, hasCredentials, OpenSkyError, type StateVector } from "@/lib/opensky";
import { lookupRoute } from "@/lib/routes";
import type { Flight, FlightsResponse, Route } from "@/lib/types";

export const dynamic = "force-dynamic";

const M_TO_FT = 3.28084;
const MS_TO_KT = 1.94384;
const MAX_RADIUS_MI = 50;

// OpenSky has a daily credit budget, so upstream results are cached and shared
// by every open tab. Anonymous: ~400 credits/day. With an API client: ~4000/day.
const cacheTtlMs = () => (hasCredentials() ? 30_000 : 180_000);
const stateCache = new Map<string, { states: StateVector[]; fetchedAt: number }>();

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const radius = Math.min(Number(sp.get("radius") ?? 15) || 15, MAX_RADIUS_MI);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  let entry = stateCache.get(key);
  let stale = false;
  let error: string | undefined;

  if (!entry || Date.now() - entry.fetchedAt > cacheTtlMs()) {
    try {
      const states = await getStates(boundingBox(lat, lon, radius));
      entry = { states, fetchedAt: Date.now() };
      stateCache.set(key, entry);
    } catch (e) {
      stale = true;
      error =
        e instanceof OpenSkyError && e.status === 429
          ? "OpenSky rate limit reached — showing last known positions."
          : "Couldn't reach OpenSky — showing last known positions.";
      if (!entry) {
        const body: FlightsResponse = { flights: [], fetchedAt: Date.now(), stale, error };
        return NextResponse.json(body, { status: 502 });
      }
    }
  }

  const airborne = entry.states
    .filter((s) => !s.onGround && s.lat !== null && s.lon !== null)
    .map((s) => ({ s, distanceMi: haversineMi(lat, lon, s.lat!, s.lon!) }))
    .filter((x) => x.distanceMi <= radius)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  const routes = await mapPool(airborne, 6, ({ s }) => lookupRoute(s.callsign));

  const flights: Flight[] = airborne.map(({ s, distanceMi }, i) => {
    const route: Route | null = routes[i];
    const fallback = airlineFromCallsign(s.callsign);
    const altM = s.baroAltitudeM ?? s.geoAltitudeM;
    return {
      icao24: s.icao24,
      callsign: s.callsign || s.icao24.toUpperCase(),
      flightNumber: s.callsign ? displayFlightNumber(s.callsign, route?.flightNumber) : s.icao24.toUpperCase(),
      airlineName: route?.airlineName ?? fallback?.name ?? null,
      airlineIata: route?.airlineIata ?? fallback?.iata ?? null,
      lat: s.lat!,
      lon: s.lon!,
      altitudeFt: altM === null ? null : Math.round(altM * M_TO_FT),
      speedKt: s.velocityMs === null ? null : Math.round(s.velocityMs * MS_TO_KT),
      headingDeg: Math.round(s.trueTrack ?? 0),
      verticalRateFpm: s.verticalRateMs === null ? null : Math.round(s.verticalRateMs * M_TO_FT * 60),
      distanceMi,
      origin: route?.origin ?? null,
      destination: route?.destination ?? null,
      lastContact: s.lastContact,
    };
  });

  const body: FlightsResponse = { flights, fetchedAt: entry.fetchedAt, stale, error };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
