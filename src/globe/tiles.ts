/**
 * Street-map tiles for the globe (see MapTiles.tsx).
 * CARTO Voyager by default (OpenStreetMap data; place names in the local
 * language); set VITE_TILE_URL to use another provider. Their attribution
 * must stay on screen while tiles show (see Globe.tsx).
 */
export const TILE_URL = (import.meta.env.VITE_TILE_URL as string | undefined)
  ?? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';
export const TILES_FROM_ALT = 0.6;   // tiles appear below this altitude (globe radii)

/** Shared with the cats: where the ground is and how high the camera is.
 *  Tiles float a hair above the sphere; cats stand on them. */
export const ground = { lift: 1, alt: 2 };

