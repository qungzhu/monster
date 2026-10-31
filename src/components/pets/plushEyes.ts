import * as THREE from 'three';

/**
 * Eyelids for the Meshy cats, whose eyes are painted into the texture (no
 * eye bones). Meshy bakes the eyes as glossy texels of the roughness
 * map, so we find each eye on the mesh (the two glossy blobs that sit side
 * by side and look alike; the nose and mouth are glossy too), and the shader closes lids over them: fabric in
 * the colour around the eye, meeting in a soft upward arch, the happy "^ ^"
 * squint of a content cat. uSquint: 0 open, 1 closed.
 */
export interface EyeInfo {
  /** Eye centres (bind-pose mesh space) with radius in w. */
  a: THREE.Vector4;
  b: THREE.Vector4;
  /** Fur colour around the eyes (linear), for the lids. */
  lid: THREE.Color;
}

const SAMPLE = 256;

function pixels(texture: THREE.Texture | null): Uint8ClampedArray | null {
  const image = texture?.image as CanvasImageSource & { width?: number; height?: number } | undefined;
  if (!image || !image.width) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, SAMPLE, SAMPLE);
    return ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  } catch {
    return null; // tainted or unsupported image
  }
}

/** Finds the two eyes on a Meshy cat mesh, or null when it can't. */
export function findEyes(geometry: THREE.BufferGeometry, roughness: THREE.Texture | null, color: THREE.Texture | null): EyeInfo | null {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  if (!pos || !uv || typeof document === 'undefined') return null;
  const rough = pixels(roughness);
  const albedo = pixels(color);
  if (!rough || !albedo) return null;
  const at = (i: number) => {
    const u = uv.getX(i) - Math.floor(uv.getX(i));
    const v = uv.getY(i) - Math.floor(uv.getY(i));
    // glTF textures are not flipped: uv (0,0) is the top-left texel
    return (Math.min(SAMPLE - 1, Math.floor(v * SAMPLE)) * SAMPLE + Math.min(SAMPLE - 1, Math.floor(u * SAMPLE))) * 4;
  };

  // Glossy vertices, grouped into blobs along the mesh's edges (vertices
  // at the same spot are joined too: glTF splits them at UV seams).
  const isGlossy = new Uint8Array(pos.count);
  let glossyCount = 0;
  for (let i = 0; i < pos.count; i++) {
    if (rough[at(i) + 1] < 0.2 * 255) { isGlossy[i] = 1; glossyCount++; }
  }
  if (glossyCount < 12) return null;
  const parent = new Int32Array(pos.count).map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const join = (i: number, j: number) => { if (isGlossy[i] && isGlossy[j]) parent[find(i)] = find(j); };
  const index = geometry.index;
  const tri = index ? index.count : pos.count;
  for (let t = 0; t < tri; t += 3) {
    const [i, j, k] = index ? [index.getX(t), index.getX(t + 1), index.getX(t + 2)] : [t, t + 1, t + 2];
    join(i, j); join(j, k); join(k, i);
  }
  const spot = new Map<string, number>();
  geometry.computeBoundingSphere();
  const q = (geometry.boundingSphere?.radius ?? 1) * 1e-4;
  for (let i = 0; i < pos.count; i++) {
    if (!isGlossy[i]) continue;
    const key = `${Math.round(pos.getX(i) / q)},${Math.round(pos.getY(i) / q)},${Math.round(pos.getZ(i) / q)}`;
    const other = spot.get(key);
    if (other === undefined) spot.set(key, i); else join(i, other);
  }
  const blobs = new Map<number, THREE.Vector3[]>();
  for (let i = 0; i < pos.count; i++) {
    if (!isGlossy[i]) continue;
    const r = find(i);
    if (!blobs.has(r)) blobs.set(r, []);
    blobs.get(r)!.push(new THREE.Vector3().fromBufferAttribute(pos, i));
  }
  const big = [...blobs.values()].filter(b => b.length >= 4).sort((p, q2) => q2.length - p.length).slice(0, 8)
    .map(points => {
      const c = points.reduce((s2, p) => s2.add(p), new THREE.Vector3()).divideScalar(points.length);
      const d = points.map(p => Math.hypot(p.x - c.x, p.y - c.y)).sort((p, q2) => p - q2);
      return { c, r: Math.max(d[Math.floor(d.length * 0.95)], 1e-4), n: points.length };
    });
  // The eyes: the pair of blobs most alike that sit side by side.
  let best: [typeof big[0], typeof big[0]] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < big.length; i++) {
    for (let j = i + 1; j < big.length; j++) {
      const [e1, e2] = [big[i], big[j]];
      const r = Math.max(e1.r, e2.r);
      const dx = Math.abs(e1.c.x - e2.c.x);
      if (dx < 2 * r) continue; // overlapping, or one blob split in two
      const score = Math.abs(e1.c.y - e2.c.y) / r + Math.abs(e1.c.z - e2.c.z) / r
        + Math.abs(Math.log(e1.n / e2.n)) + Math.abs(Math.log(e1.r / e2.r));
      if (score < bestScore) { bestScore = score; best = [e1, e2]; }
    }
  }
  if (!best || bestScore > 3) return null;
  const r = Math.max(best[0].r, best[1].r) * 1.2;
  const [a, b] = best.map(e => new THREE.Vector4(e.c.x, e.c.y, e.c.z, r));

  // Lid colour: the fur in a ring just around the eyes.
  let rr = 0, g = 0, bl = 0, n = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    for (const e of [a, b]) {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d > e.w * 1.25 && d < e.w * 1.9 && Math.abs(p.z - e.z) < e.w * 1.5) {
        const k = at(i);
        if (rough[k + 1] < 0.25 * 255) continue;
        rr += albedo[k]; g += albedo[k + 1]; bl += albedo[k + 2]; n++;
      }
    }
  }
  if (!n) return null;
  const lid = new THREE.Color().setRGB(rr / n / 255, g / n / 255, bl / n / 255, THREE.SRGBColorSpace);
  return { a, b, lid };
}

/** Shader pieces; `plushLid` (0..1, how much this texel is covered) is
 *  declared in main() so the emissive pass can dim covered eyes too. */
export const EYE_UNIFORMS = `
uniform vec4 uEyeA, uEyeB;
uniform vec3 uEyeLid;
uniform float uSquint;
uniform sampler2D uEyeMask;
`;

export const EYE_FRAGMENT = `
  float plushLid = 0.0;
  #ifdef PLUSH_EYES
  {
    vec4 E = distance(vPlushPos.xy, uEyeA.xy) < distance(vPlushPos.xy, uEyeB.xy) ? uEyeA : uEyeB;
    vec2 d = (vPlushPos.xy - E.xy) / E.w;
    float near = 1.0 - smoothstep(1.15, 1.35, length(d));
    float eyeTexel = 1.0 - smoothstep(0.18, 0.3, texture2D(uEyeMask, vMapUv).g);
    // lids meet along an upward arch (happy squint), opening as squint -> 0
    float meet = -0.1 + 0.35 * uSquint * (1.0 - d.x * d.x);
    float open = 1.15 * (1.0 - uSquint);
    float off = abs(d.y - meet) - open;
    float cover = smoothstep(-0.04, 0.04, off) * near * step(0.02, uSquint);
    plushLid = cover * max(eyeTexel, near * step(0.85, uSquint));
    vec3 lid = uEyeLid * (1.0 - 0.18 * (1.0 - smoothstep(0.0, 0.25, abs(d.y - meet))));
    // the line where the lids meet: a soft dark stroke once nearly closed
    float lash = (1.0 - smoothstep(0.0, 0.09, abs(d.y - meet))) * smoothstep(0.75, 1.0, uSquint) * near;
    diffuseColor.rgb = mix(diffuseColor.rgb, lid, plushLid);
    diffuseColor.rgb = mix(diffuseColor.rgb, uEyeLid * 0.25, lash * 0.85);
  }
  #endif
`;
