const EARTH_CIRCUMFERENCE_MI = 24901.46;
const TILE = 256;
const MAX_ZOOM = 16;

// Esri World Dark Gray canvas: keyless raster tiles, streets in the base layer and
// place/road names in a transparent reference layer. Note the {z}/{y}/{x} order.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
export const TILE_ATTRIBUTION = "© Esri, HERE, Garmin, © OpenStreetMap";

export interface MapTile {
  key: string;
  src: string;
  labelSrc: string;
  left: number;
  top: number;
  size: number;
}

/** World pixel position (at zoom z, 256px tiles) in Web Mercator. */
function worldPx(lat: number, lon: number, z: number) {
  const n = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: ((lon + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

/**
 * Street-map tiles laid out so the scale matches `pxPerMi` at home's latitude,
 * with home at (cx, cy). Positions are relative to the map container.
 */
export function tilesFor(lat: number, lon: number, pxPerMi: number, cx: number, cy: number, w: number, h: number): MapTile[] {
  if (pxPerMi <= 0 || w <= 0 || h <= 0) return [];
  const exactZ = Math.log2((pxPerMi * EARTH_CIRCUMFERENCE_MI * Math.cos((lat * Math.PI) / 180)) / TILE);
  const z = Math.min(MAX_ZOOM, Math.max(1, Math.round(exactZ)));
  const k = 2 ** (exactZ - z); // css px per native tile px
  const size = TILE * k;
  const home = worldPx(lat, lon, z);
  const max = 2 ** z;

  const x0 = Math.floor(home.x / TILE - cx / size);
  const x1 = Math.floor(home.x / TILE + (w - cx) / size);
  const y0 = Math.max(0, Math.floor(home.y / TILE - cy / size));
  const y1 = Math.min(max - 1, Math.floor(home.y / TILE + (h - cy) / size));

  const tiles: MapTile[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const wrapped = ((tx % max) + max) % max;
      tiles.push({
        key: `${z}/${tx}/${ty}`,
        src: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/${z}/${ty}/${wrapped}`,
        labelSrc: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/${z}/${ty}/${wrapped}`,
        left: cx + (tx * TILE - home.x) * k,
        top: cy + (ty * TILE - home.y) * k,
        size,
      });
    }
  }
  return tiles;
}
