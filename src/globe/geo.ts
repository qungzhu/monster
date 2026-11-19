import * as THREE from 'three';

/** Globe radius in scene units. */
export const EARTH_RADIUS = 1;

/** Latitude / longitude (degrees) -> point on a sphere of radius r. Matches
 *  an equirectangular texture on three's SphereGeometry (u = 0 at -180°). */
export function latLonToVec3(lat: number, lon: number, r = EARTH_RADIUS, out = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Deterministic pseudo-random in [0, 1) from a string (same input, same
 *  offset: a stranger's blurred spot doesn't jitter on every update, which
 *  would let someone average the jitter away). */
export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Privacy: what a stranger may see of someone's position. Only the city,
 * drawn at the city centre pushed 3-8 km in a direction fixed per person,
 * never their real coordinates. (The real server must do this before
 * sending: a client must never receive a stranger's exact location.)
 */
export function blurToCity(id: string, city: { lat: number; lon: number }) {
  const angle = hash01(id + ':a') * Math.PI * 2;
  const km = 3 + hash01(id + ':d') * 5;
  const dLat = (km / 111) * Math.cos(angle);
  const dLon = (km / (111 * Math.cos(THREE.MathUtils.degToRad(city.lat)))) * Math.sin(angle);
  return { lat: city.lat + dLat, lon: city.lon + dLon };
}

/** Heat map input: online counts on a coarse grid. Cells with fewer than
 *  MIN_HEAT people are dropped, so one lone user can't be picked out. */
export const HEAT_CELL_DEG = 4;
export const MIN_HEAT = 3;

export interface HeatCell { lat: number; lon: number; count: number }

export function heatGrid(points: { lat: number; lon: number }[]): HeatCell[] {
  const cells = new Map<string, number>();
  for (const p of points) {
    const k = `${Math.floor(p.lat / HEAT_CELL_DEG)},${Math.floor(p.lon / HEAT_CELL_DEG)}`;
    cells.set(k, (cells.get(k) ?? 0) + 1);
  }
  const out: HeatCell[] = [];
  for (const [k, count] of cells) {
    if (count < MIN_HEAT) continue;
    const [a, b] = k.split(',').map(Number);
    out.push({ lat: (a + 0.5) * HEAT_CELL_DEG, lon: (b + 0.5) * HEAT_CELL_DEG, count });
  }
  return out;
}
