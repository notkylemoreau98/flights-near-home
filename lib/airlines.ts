/**
 * Fallback ICAO → airline info, used when the route lookup has no data.
 * `color` is the badge background when a logo image can't be loaded.
 * Extend freely.
 */
export const AIRLINES: Record<string, { iata: string; name: string; color: string; ink?: string }> =
  {
    AAL: { iata: "AA", name: "American Airlines", color: "#dfe6ee", ink: "#0b1a33" },
    ASA: { iata: "AS", name: "Alaska Airlines", color: "#01426a" },
    AAY: { iata: "G4", name: "Allegiant Air", color: "#1b5aa6" },
    ACA: { iata: "AC", name: "Air Canada", color: "#b3182f" },
    AFR: { iata: "AF", name: "Air France", color: "#002157" },
    AMX: { iata: "AM", name: "Aeroméxico", color: "#0b2343" },
    ANA: { iata: "NH", name: "All Nippon Airways", color: "#13448f" },
    BAW: { iata: "BA", name: "British Airways", color: "#075aaa" },
    CPA: { iata: "CX", name: "Cathay Pacific", color: "#006564" },
    DAL: { iata: "DL", name: "Delta Air Lines", color: "#b3182f" },
    EJA: { iata: "", name: "NetJets", color: "#3a3f47" },
    ENY: { iata: "MQ", name: "Envoy Air", color: "#3a3f47" },
    FDX: { iata: "FX", name: "FedEx", color: "#4d148c" },
    FFT: { iata: "F9", name: "Frontier Airlines", color: "#1f6f50" },
    HAL: { iata: "HA", name: "Hawaiian Airlines", color: "#5b2c83" },
    JAL: { iata: "JL", name: "Japan Airlines", color: "#b3182f" },
    JBU: { iata: "B6", name: "JetBlue", color: "#0033a0" },
    KAL: { iata: "KE", name: "Korean Air", color: "#00589c" },
    NKS: { iata: "NK", name: "Spirit Airlines", color: "#8a7a00" },
    QFA: { iata: "QF", name: "Qantas", color: "#b3182f" },
    QXE: { iata: "QX", name: "Horizon Air", color: "#01426a" },
    SKW: { iata: "OO", name: "SkyWest Airlines", color: "#3d5a80" },
    SWA: { iata: "WN", name: "Southwest Airlines", color: "#304cb2" },
    UAE: { iata: "EK", name: "Emirates", color: "#b3182f" },
    UAL: { iata: "UA", name: "United Airlines", color: "#1a4fa3" },
    UPS: { iata: "5X", name: "UPS Airlines", color: "#4a2f1d" },
    VOI: { iata: "Y4", name: "Volaris", color: "#6b2c83" },
    WJA: { iata: "WS", name: "WestJet", color: "#00758f" },
  };

export function airlineFromCallsign(callsign: string) {
  const prefix = callsign.slice(0, 3).toUpperCase();
  return /^[A-Z]{3}\d/.test(callsign) ? (AIRLINES[prefix] ?? null) : null;
}

/** "UAL1542" → "UA 1542" when the airline is known, otherwise the callsign. */
export function displayFlightNumber(callsign: string, iataFromRoute?: string | null): string {
  if (iataFromRoute) {
    const m = iataFromRoute.match(/^([A-Z0-9]{2})(\d+[A-Z]?)$/);
    if (m) return `${m[1]} ${m[2]}`;
  }
  const airline = airlineFromCallsign(callsign);
  const num = callsign.slice(3);
  if (airline?.iata && /^\d/.test(num)) return `${airline.iata} ${num}`;
  return callsign;
}

export function badgeColors(airlineIcao: string | null) {
  const a = airlineIcao ? AIRLINES[airlineIcao] : undefined;
  return { bg: a?.color ?? "#3a3f47", ink: a?.ink ?? "#ffffff" };
}
