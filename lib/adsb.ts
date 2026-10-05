import "server-only";

/**
 * adsb.lol live aircraft client (server side only). Free, no key, open data (ODbL).
 * Docs: https://api.adsb.lol/docs — response is readsb's aircraft.json format.
 */
const API = "https://api.adsb.lol/v2";
const NM_PER_MI = 0.868976;
const MAX_RADIUS_NM = 250;

export interface Aircraft {
  icao24: string;
  callsign: string;
  registration: string | null;
  typeCode: string | null; // ICAO aircraft type, e.g. "B738"
  lat: number | null;
  lon: number | null;
  altitudeFt: number | null;
  onGround: boolean;
  speedKt: number | null;
  trackDeg: number | null;
  verticalRateFpm: number | null;
  lastContact: number; // unix seconds
}

interface ReadsbAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  true_heading?: number;
  baro_rate?: number;
  geom_rate?: number;
  seen?: number;
}

export class AdsbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** All aircraft within `radiusMi` of a point. */
export async function getAircraft(lat: number, lon: number, radiusMi: number): Promise<Aircraft[]> {
  const nm = Math.min(MAX_RADIUS_NM, Math.ceil(radiusMi * NM_PER_MI));

  const res = await fetch(`${API}/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${nm}`, {
    headers: { Accept: "application/json", "User-Agent": "flights-near-home/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new AdsbError(`adsb.lol request failed (${res.status})`, res.status);
  }

  const json = (await res.json()) as { now?: number; ac?: ReadsbAircraft[] };

  const nowSec = (json.now ?? Date.now()) / 1000;

  return (json.ac ?? []).map((a) => ({
    icao24: a.hex.replace(/^~/, ""), // "~" marks non-ICAO (TIS-B) addresses
    callsign: a.flight?.trim() ?? "",
    registration: a.r ?? null,
    typeCode: a.t ?? null,
    lat: num(a.lat),
    lon: num(a.lon),
    altitudeFt: num(a.alt_baro) ?? num(a.alt_geom),
    onGround: a.alt_baro === "ground",
    speedKt: num(a.gs),
    trackDeg: num(a.track) ?? num(a.true_heading),
    verticalRateFpm: num(a.baro_rate) ?? num(a.geom_rate),
    lastContact: Math.round(nowSec - (a.seen ?? 0)),
  }));
}
