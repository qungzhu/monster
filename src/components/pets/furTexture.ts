import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural fur: generates a diffuse map (fine directional strokes in
 * light/dark variations of the base coat color) plus a matching bump
 * map. Applied to a MeshStandardMaterial this reads as soft fur
 * instead of smooth plastic — the single biggest realism win for the
 * parametric pets.
 *
 * Deterministic (seeded by the color) so re-renders are stable.
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashColor(hex: string): number {
  let h = 2166136261;
  for (let i = 0; i < hex.length; i++) {
    h ^= hex.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shade(hex: string, f: number): string {
  const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * f)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * f)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * f)));
  return `rgb(${r},${g},${b})`;
}

export interface FurMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

const furCache = new Map<string, FurMaps>();

export function makeFur(baseColor: string, streakLength = 10): FurMaps {
  const cacheKey = `${baseColor}-${streakLength}`;
  const cached = furCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const rand = mulberry32(hashColor(baseColor));

  const diffuse = document.createElement('canvas');
  diffuse.width = size; diffuse.height = size;
  const d = diffuse.getContext('2d')!;
  d.fillStyle = baseColor;
  d.fillRect(0, 0, size, size);

  const bump = document.createElement('canvas');
  bump.width = size; bump.height = size;
  const b = bump.getContext('2d')!;
  b.fillStyle = '#808080';
  b.fillRect(0, 0, size, size);

  d.lineWidth = 1;
  b.lineWidth = 1;
  const streaks = 2600;
  for (let i = 0; i < streaks; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = streakLength * (0.6 + rand() * 0.8);
    const angle = Math.PI / 2 + (rand() - 0.5) * 0.7; // mostly downward strokes
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;
    const tone = 0.82 + rand() * 0.36; // 0.82–1.18 of base

    d.strokeStyle = shade(baseColor, tone);
    d.globalAlpha = 0.55;
    d.beginPath();
    d.moveTo(x, y);
    d.lineTo(x + dx, y + dy);
    d.stroke();

    const g = Math.round(128 + (tone - 1) * 240);
    b.strokeStyle = `rgb(${g},${g},${g})`;
    b.globalAlpha = 0.6;
    b.beginPath();
    b.moveTo(x, y);
    b.lineTo(x + dx, y + dy);
    b.stroke();
  }

  const map = new THREE.CanvasTexture(diffuse);
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const tex of [map, bumpMap]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 2.5);
    tex.anisotropy = 4;
  }
  map.colorSpace = THREE.SRGBColorSpace;

  const result = { map, bumpMap };
  furCache.set(cacheKey, result);
  return result;
}

/** Hook: fur material maps for a coat color. */
export function useFur(baseColor: string, streakLength?: number): FurMaps {
  return useMemo(() => makeFur(baseColor, streakLength), [baseColor, streakLength]);
}
