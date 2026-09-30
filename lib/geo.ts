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
