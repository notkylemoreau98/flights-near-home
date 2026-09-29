export interface Home {
  address: string;
  lat: number;
  lon: number;
}

export interface Airport {
  iata: string | null;
  icao: string | null;
  city: string | null;
  name: string | null;
}

export interface Route {
  airlineName: string | null;
  airlineIata: string | null;
  airlineIcao: string | null;
  flightNumber: string | null; // e.g. "UA 1542"
  origin: Airport | null;
  destination: Airport | null;
}

/** One aircraft as the UI needs it. Units are converted for display (ft, kt). */
export interface Flight {
  icao24: string;
  callsign: string; // ICAO callsign, e.g. "UAL1542"
  flightNumber: string; // display, e.g. "UA 1542" (falls back to callsign)
  airlineName: string | null;
  airlineIata: string | null;
  lat: number;
  lon: number;
  altitudeFt: number | null;
  speedKt: number | null;
  headingDeg: number;
  verticalRateFpm: number | null;
  distanceMi: number;
  origin: Airport | null;
  destination: Airport | null;
  lastContact: number; // unix seconds
}

export interface FlightsResponse {
  flights: Flight[];
  fetchedAt: number; // unix ms when OpenSky data was fetched
  stale: boolean; // true when serving cache after an upstream error / rate limit
  error?: string;
}

export interface GeocodeResponse {
  address: string;
  lat: number;
  lon: number;
}
