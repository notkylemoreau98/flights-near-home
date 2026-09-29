import "server-only";

/**
 * OpenSky Network REST client (server side only).
 * Docs: https://openskynetwork.github.io/opensky-api/rest.html
 *
 * Auth: OAuth2 client credentials (OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET).
 * Without them requests are anonymous, which has a much smaller daily credit budget.
 */
const API = "https://opensky-network.org/api";
const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

export interface StateVector {
  icao24: string;
  callsign: string;
  originCountry: string;
  lastContact: number;
  lon: number | null;
  lat: number | null;
  baroAltitudeM: number | null;
  onGround: boolean;
  velocityMs: number | null;
  trueTrack: number | null;
  verticalRateMs: number | null;
  geoAltitudeM: number | null;
}

let token: { value: string; expiresAt: number } | null = null;

export const hasCredentials = () => Boolean(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET);

async function getToken(): Promise<string | null> {
  if (!hasCredentials()) return null;
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.OPENSKY_CLIENT_ID!,
      client_secret: process.env.OPENSKY_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenSky auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

export class OpenSkyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** All state vectors inside a bounding box. */
export async function getStates(bbox: { lamin: number; lomin: number; lamax: number; lomax: number }): Promise<StateVector[]> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(bbox).map(([k, v]) => [k, v.toFixed(4)])),
  );
  const accessToken = await getToken();
  const res = await fetch(`${API}/states/all?${params}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store",
  });
  if (res.status === 401 && accessToken) token = null; // force refresh next time
  if (!res.ok) throw new OpenSkyError(`OpenSky request failed (${res.status})`, res.status);

  const json = (await res.json()) as { time: number; states: unknown[][] | null };
  return (json.states ?? []).map((s) => ({
    icao24: String(s[0]),
    callsign: typeof s[1] === "string" ? s[1].trim() : "",
    originCountry: String(s[2] ?? ""),
    lastContact: Number(s[4] ?? 0),
    lon: typeof s[5] === "number" ? s[5] : null,
    lat: typeof s[6] === "number" ? s[6] : null,
    baroAltitudeM: typeof s[7] === "number" ? s[7] : null,
    onGround: Boolean(s[8]),
    velocityMs: typeof s[9] === "number" ? s[9] : null,
    trueTrack: typeof s[10] === "number" ? s[10] : null,
    verticalRateMs: typeof s[11] === "number" ? s[11] : null,
    geoAltitudeM: typeof s[13] === "number" ? s[13] : null,
  }));
}
