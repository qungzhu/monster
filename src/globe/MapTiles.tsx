import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS, latLonToVec3 } from './geo';
import { TILE_URL, TILES_FROM_ALT, ground } from './tiles';

/**
 * Street-level map when you zoom in: standard web-map tiles (Web Mercator,
 * z/x/y) laid onto the globe as curved patches around the point you are
 * looking at, sharper the closer you get, like a real map app. Far out the
 * hand-drawn plush globe shows instead.
 *
 * Tiles: CARTO Voyager (OpenStreetMap data; place names in the local
 * language) by default; set VITE_TILE_URL to use another provider. Their
 * attribution must stay on screen while tiles show (see Globe.tsx).
 */
const SUBDOMAINS = ['a', 'b', 'c', 'd'];
const GRID = 2;                      // tiles each side of the centre one (5 x 5)
const MAX_Z = 18;
const CACHE = 160;

const tileUrl = (z: number, x: number, y: number) =>
  TILE_URL.replace('{s}', SUBDOMAINS[(x + y) % SUBDOMAINS.length]).replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

const lonOf = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const latOf = (y: number, z: number) => THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))));
const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const r = THREE.MathUtils.degToRad(Math.max(-85.05, Math.min(85.05, lat)));
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/** A curved patch for one tile; texture v runs linearly in Mercator y. */
function tileGeometry(z: number, x: number, y: number) {
  const seg = z < 7 ? 16 : z < 11 ? 8 : 4;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3();
  for (let j = 0; j <= seg; j++) {
    const lat = latOf(y + j / seg, z);
    for (let i = 0; i <= seg; i++) {
      latLonToVec3(lat, lonOf(x + i / seg, z), EARTH_RADIUS, v);
      pos.push(v.x, v.y, v.z);
      uv.push(i / seg, 1 - j / seg);
    }
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

interface Tile { key: string; mesh: THREE.Mesh; ready: boolean; used: number }

export function MapTiles({ onActive }: { onActive?: (active: boolean) => void }) {
  const gl = useThree(s => s.gl);
  const group = useRef<THREE.Group>(null);
  const cache = useRef(new Map<string, Tile>());
  const loader = useMemo(() => { const l = new THREE.TextureLoader(); l.setCrossOrigin('anonymous'); return l; }, []);
  const want = useRef('');
  const [active, setActive] = useState(false);
  useEffect(() => { onActive?.(active); }, [active, onActive]);

  const getTile = (z: number, x: number, y: number) => {
    const key = `${z}/${x}/${y}`;
    let t = cache.current.get(key);
    if (!t) {
      // finer tiles win the depth test over the coarser ones kept beneath
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, toneMapped: false,
        polygonOffset: true, polygonOffsetFactor: -z, polygonOffsetUnits: -2 * z,
      });
      const mesh = new THREE.Mesh(tileGeometry(z, x, y), mat);
      mesh.renderOrder = 2;
      const tile: Tile = { key, mesh, ready: false, used: 0 };
      mesh.userData.tile = tile;
      loader.load(tileUrl(z, x, y), tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        mat.map = tex;
        mat.needsUpdate = true;
        tile.ready = true;
      }, undefined, () => { /* offline / blocked: the plush globe shows through */ });
      cache.current.set(key, tile);
      t = tile;
    }
    return t;
  };

  const evict = () => {
    if (cache.current.size <= CACHE) return;
    const old = [...cache.current.values()].sort((a, b) => a.used - b.used).slice(0, cache.current.size - CACHE);
    for (const t of old) {
      group.current?.remove(t.mesh);
      (t.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      (t.mesh.material as THREE.Material).dispose();
      t.mesh.geometry.dispose();
      cache.current.delete(t.key);
    }
  };

  const frame = useRef(0);
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const dist = cam.position.length();
    const alt = Math.max(1e-5, dist - EARTH_RADIUS);
    ground.alt = alt;
    // tiles hover just above the sphere's facets; cats stand on that
    ground.lift = 1 + Math.min(0.0012, alt * 0.01);
    // close in, the near plane has to come with us
    const near = Math.max(1e-5, alt * 0.1);
    if (Math.abs(cam.near - near) / near > 0.2) { cam.near = near; cam.far = dist + 3; cam.updateProjectionMatrix(); }

    const on = alt < TILES_FROM_ALT;
    if (on !== active) setActive(on);
    const g = group.current;
    if (!g) return;
    g.visible = on;
    g.scale.setScalar(ground.lift);
    if (!on) return;
    frame.current++;

    // what the camera looks at, and a zoom level so the 5x5 block covers it
    const dir = cam.position.clone().normalize();
    const lat = THREE.MathUtils.radToDeg(Math.asin(dir.y));
    const lon = THREE.MathUtils.radToDeg(Math.atan2(dir.z, -dir.x)) - 180;
    const lonN = ((lon + 540) % 360) - 180;
    const viewDeg = THREE.MathUtils.radToDeg(2 * alt * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / Math.max(0.2, Math.cos(THREE.MathUtils.degToRad(lat)));
    const z = THREE.MathUtils.clamp(Math.floor(Math.log2((360 * (2 * GRID + 1)) / (viewDeg * 1.6))), 2, MAX_Z);

    const cx = tileX(lonN, z), cy = tileY(lat, z), n = 2 ** z;
    const key = `${z}:${cx}:${cy}`;
    if (key !== want.current) {
      want.current = key;
      const shown = new Set<string>();
      for (let dy = -GRID; dy <= GRID; dy++) for (let dx = -GRID; dx <= GRID; dx++) {
        const y = cy + dy;
        if (y < 0 || y >= n) continue;
        const x = (((cx + dx) % n) + n) % n;
        const t = getTile(z, x, y);
        t.used = frame.current;
        shown.add(t.key);
        if (t.mesh.parent !== g) g.add(t.mesh);
      }
      // keep the coarser parent tiles of the old view under the new ones
      // until those load; drop the rest from the scene
      for (const t of cache.current.values()) {
        if (shown.has(t.key)) continue;
        const tz = Number(t.key.split('/')[0]);
        if (tz < z && t.mesh.parent === g) { t.mesh.renderOrder = 1; continue; }
        if (t.mesh.parent === g) g.remove(t.mesh);
      }
      for (const k of shown) cache.current.get(k)!.mesh.renderOrder = 2;
      evict();
    }
    // fade tiles in as they arrive
    for (const c of g.children) {
      const t = c.userData.tile as Tile | undefined;
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (t?.ready && m.opacity < 1) m.opacity = Math.min(1, m.opacity + dt * 3);
    }
  });

  useEffect(() => {
    const c = cache.current;
    return () => {
      for (const t of c.values()) {
        (t.mesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (t.mesh.material as THREE.Material).dispose();
        t.mesh.geometry.dispose();
      }
      c.clear();
    };
  }, []);

  return <group ref={group} />;
}
