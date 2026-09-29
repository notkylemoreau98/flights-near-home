import "server-only";
import type { Airport, Route } from "./types";

/**
 * OpenSky's live state vectors don't say where a flight is going, so we look
 * the callsign up in adsbdb (free, no key): https://www.adsbdb.com
 * Results (including misses) are cached in memory for 12 hours.
 */
const TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { route: Route | null; expiresAt: number }>();
const inflight = new Map<string, Promise<Route | null>>();

interface AdsbdbAirport {
  iata_code?: string;
  icao_code?: string;
  municipality?: string;
  name?: string;
}
interface AdsbdbResponse {
  response?:
    | string
    | {
        flightroute?: {
          callsign_iata?: string | null;
          airline?: { name?: string; iata?: string; icao?: string } | null;
          origin?: AdsbdbAirport | null;
          destination?: AdsbdbAirport | null;
        };
      };
}

const toAirport = (a?: AdsbdbAirport | null): Airport | null =>
  a
    ? { iata: a.iata_code ?? null, icao: a.icao_code ?? null, city: a.municipality ?? null, name: a.name ?? null }
    : null;

async function fetchRoute(callsign: string): Promise<Route | null> {
  const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`adsbdb ${res.status}`);
  const json = (await res.json()) as AdsbdbResponse;
  const fr = typeof json.response === "object" ? json.response.flightroute : undefined;
  if (!fr) return null;

  const iata = fr.callsign_iata ?? null;
  return {
    airlineName: fr.airline?.name ?? null,
    airlineIata: fr.airline?.iata ?? null,
    airlineIcao: fr.airline?.icao ?? null,
    flightNumber: iata,
    origin: toAirport(fr.origin),
    destination: toAirport(fr.destination),
  };
}

export async function lookupRoute(callsign: string): Promise<Route | null> {
  if (!callsign) return null;
  const hit = cache.get(callsign);
  if (hit && hit.expiresAt > Date.now()) return hit.route;
  const pending = inflight.get(callsign);
  if (pending) return pending;

  const p = fetchRoute(callsign)
    .then((route) => {
      cache.set(callsign, { route, expiresAt: Date.now() + TTL_MS });
      return route;
    })
    .catch(() => null) // don't cache transient errors
    .finally(() => inflight.delete(callsign));
  inflight.set(callsign, p);
  return p;
}
