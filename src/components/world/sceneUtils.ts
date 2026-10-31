import * as THREE from 'three';

/** Ground level of the living-world scenes; the pet stands at the origin. */
export const GROUND = -0.67;

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textures = new Map<string, THREE.CanvasTexture>();

/** A cached canvas texture, drawn once by `draw`. */
export function canvasTexture(key: string, size: number, repeat: number, draw: (c: CanvasRenderingContext2D, size: number) => void) {
  let t = textures.get(key);
  if (!t) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return t;
}

/** Mottled natural ground (grass, soil, snow) from a few colours. */
export function mottled(key: string, base: string, spots: string[], seed: number, repeat = 6) {
  return canvasTexture(key, 512, repeat, (c, s) => {
    const r = rng(seed);
    c.fillStyle = base;
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = spots[i % spots.length];
      c.globalAlpha = 0.12 + r() * 0.25;
      c.beginPath();
      c.ellipse(r() * s, r() * s, 2 + r() * 14, 1 + r() * 6, r() * 3, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
  });
}
