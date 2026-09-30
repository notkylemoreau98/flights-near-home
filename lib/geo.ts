const EARTH_RADIUS_MI = 3958.8;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles. */
export function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

/**
 * Offset of a point from home in miles (x = east, y = north). Equirectangular,
 * which is accurate enough over a ~15 mile radius.
 */
export function offsetMi(homeLat: number, homeLon: number, lat: number, lon: number) {
  return {
    x: (lon - homeLon) * 69.172 * Math.cos(toRad(homeLat)),
    y: (lat - homeLat) * 69.0,
  };
}

/** Initial bearing from point 1 to point 2, in radians. */
function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const [p1, p2, dLon] = [toRad(lat1), toRad(lat2), toRad(lon2 - lon1)];
  return Math.atan2(Math.sin(dLon) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon));
}

type LatLon = { lat: number; lon: number };

/**
 * Where a point sits relative to the great-circle path from `a` to `b`, in miles:
 * `crossTrack` is the (unsigned) distance off the path, `alongTrack` how far along it
 * from `a` (negative = behind `a`), `length` the path length.
 */
export function pathPosition(p: LatLon, a: LatLon, b: LatLon) {
  const d13 = haversineMi(a.lat, a.lon, p.lat, p.lon) / EARTH_RADIUS_MI;
  const dBearing = bearingRad(a.lat, a.lon, p.lat, p.lon) - bearingRad(a.lat, a.lon, b.lat, b.lon);
  const xt = Math.asin(Math.sin(d13) * Math.sin(dBearing));
  const at = Math.acos(Math.min(1, Math.cos(d13) / Math.cos(xt))) * Math.sign(Math.cos(dBearing));
  return {
    crossTrack: Math.abs(xt) * EARTH_RADIUS_MI,
    alongTrack: at * EARTH_RADIUS_MI,
    length: haversineMi(a.lat, a.lon, b.lat, b.lon),
  };
}
