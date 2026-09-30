import { NextResponse, type NextRequest } from "next/server";
import { AdsbError, getAircraft, type Aircraft } from "@/lib/adsb";
import { airlineFromCallsign, displayFlightNumber } from "@/lib/airlines";
import { haversineMi } from "@/lib/geo";
import { lookupRoute } from "@/lib/routes";
import type { Flight, FlightsResponse, Route } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_RADIUS_MI = 50;

// adsb.lol is free and volunteer-run (rate limits are dynamic, based on load), so
// upstream results are cached briefly and shared by every tab hitting this instance.
const CACHE_TTL_MS = 15_000;
const aircraftCache = new Map<string, { aircraft: Aircraft[]; fetchedAt: number }>();

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
  let entry = aircraftCache.get(key);
  let stale = false;
  let error: string | undefined;

  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    try {
      const aircraft = await getAircraft(lat, lon, radius);
      entry = { aircraft, fetchedAt: Date.now() };
      aircraftCache.set(key, entry);
    } catch (e) {
      stale = true;
      error =
        e instanceof AdsbError && e.status === 429
          ? "Flight data rate limit reached — showing last known positions."
          : "Couldn't reach flight data — showing last known positions.";
      if (!entry) {
        const body: FlightsResponse = { flights: [], fetchedAt: Date.now(), stale, error };
        return NextResponse.json(body, { status: 502 });
      }
    }
  }

  const airborne = entry.aircraft
    .filter((a) => !a.onGround && a.lat !== null && a.lon !== null)
    .map((a) => ({ a, distanceMi: haversineMi(lat, lon, a.lat!, a.lon!) }))
    .filter((x) => x.distanceMi <= radius)
    .sort((x, y) => x.distanceMi - y.distanceMi);

  const routes = await mapPool(airborne, 6, ({ a }) => lookupRoute(a.callsign));

  const flights: Flight[] = airborne.map(({ a, distanceMi }, i) => {
    const route: Route | null = routes[i];
    const fallback = airlineFromCallsign(a.callsign);
    const fallbackId = a.registration ?? a.icao24.toUpperCase();
    return {
      icao24: a.icao24,
      callsign: a.callsign || fallbackId,
      flightNumber: a.callsign ? displayFlightNumber(a.callsign, route?.flightNumber) : fallbackId,
      airlineName: route?.airlineName ?? fallback?.name ?? null,
      airlineIata: route?.airlineIata ?? fallback?.iata ?? null,
      lat: a.lat!,
      lon: a.lon!,
      altitudeFt: a.altitudeFt === null ? null : Math.round(a.altitudeFt),
      speedKt: a.speedKt === null ? null : Math.round(a.speedKt),
      headingDeg: Math.round(a.trackDeg ?? 0),
      verticalRateFpm: a.verticalRateFpm === null ? null : Math.round(a.verticalRateFpm),
      distanceMi,
      origin: route?.origin ?? null,
      destination: route?.destination ?? null,
      lastContact: a.lastContact,
    };
  });

  const body: FlightsResponse = { flights, fetchedAt: entry.fetchedAt, stale, error };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
