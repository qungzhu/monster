// Which plush cats get eyelids? Runs the app's eye finder
// (src/components/pets/plushEyes.ts) offline on every rigged model, and for
// the ones it can't do, writes their texture with the glossy texels marked
// and a 10% UV grid, so the eyes can be marked by hand (glbEyesUV in
// src/data/breeds.ts).
//
//   node scripts/check-eyes.mjs [outDir]
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = new URL('../', import.meta.url).pathname;
const dir = path.join(root, 'public/models/plush/rigged');
const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const SAMPLE = 256;

async function pixels(tex) {
  return sharp(Buffer.from(tex.getImage())).resize(SAMPLE, SAMPLE, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
}

// Same steps as findEyes() in plushEyes.ts.
function findEyes(pos, uv, index, rough) {
  const n = pos.length / 3;
  const at = i => {
    const u = uv[2 * i] - Math.floor(uv[2 * i]);
    const v = uv[2 * i + 1] - Math.floor(uv[2 * i + 1]);
    return (Math.min(SAMPLE - 1, Math.floor(v * SAMPLE)) * SAMPLE + Math.min(SAMPLE - 1, Math.floor(u * SAMPLE))) * 4;
  };
  const glossy = new Uint8Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) if (rough[at(i) + 1] < 0.2 * 255) { glossy[i] = 1; count++; }
  if (count < 12) return { why: 'no glossy texels' };
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (i, j) => { if (glossy[i] && glossy[j]) parent[find(i)] = find(j); };
  const tri = index ? index.length : n;
  for (let t = 0; t < tri; t += 3) {
    const [i, j, k] = index ? [index[t], index[t + 1], index[t + 2]] : [t, t + 1, t + 2];
    join(i, j); join(j, k); join(k, i);
  }
  let rad = 0;
  for (let i = 0; i < n; i++) rad = Math.max(rad, Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]));
  const q = rad * 1e-4, spot = new Map();
  for (let i = 0; i < n; i++) {
    if (!glossy[i]) continue;
    const key = `${Math.round(pos[3 * i] / q)},${Math.round(pos[3 * i + 1] / q)},${Math.round(pos[3 * i + 2] / q)}`;
    const o = spot.get(key);
    if (o === undefined) spot.set(key, i); else join(i, o);
  }
  const blobs = new Map();
  for (let i = 0; i < n; i++) if (glossy[i]) { const r = find(i); if (!blobs.has(r)) blobs.set(r, []); blobs.get(r).push(i); }
  const big = [...blobs.values()].filter(b => b.length >= 4).sort((a, b) => b.length - a.length).slice(0, 8).map(ids => {
    const c = [0, 0, 0];
    for (const i of ids) for (let k = 0; k < 3; k++) c[k] += pos[3 * i + k] / ids.length;
    const d = ids.map(i => Math.hypot(pos[3 * i] - c[0], pos[3 * i + 1] - c[1])).sort((a, b) => a - b);
    return { c, r: Math.max(d[Math.floor(d.length * 0.95)], 1e-4), n: ids.length };
  });
  let best = null, score = Infinity;
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
    const [a, b] = [big[i], big[j]];
    const r = Math.max(a.r, b.r);
    if (Math.abs(a.c[0] - b.c[0]) < 2 * r) continue;
    const s = Math.abs(a.c[1] - b.c[1]) / r + Math.abs(a.c[2] - b.c[2]) / r + Math.abs(Math.log(a.n / b.n)) + Math.abs(Math.log(a.r / b.r));
    if (s < score) { score = s; best = [a, b]; }
  }
  if (!best || score > 3) return { why: `no matching pair (${big.length} blobs, best score ${score.toFixed(1)})` };
  return { ok: true, score };
}

const failed = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
  const doc = await io.read(path.join(dir, f));
  await doc.transform(dequantize());
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const mat = prim.getMaterial();
  const roughTex = mat.getMetallicRoughnessTexture();
  if (!roughTex) { failed.push(f); console.log(`${f}: no roughness map`); continue; }
  const res = findEyes(prim.getAttribute('POSITION').getArray(), prim.getAttribute('TEXCOORD_0').getArray(),
    prim.getIndices()?.getArray(), await pixels(roughTex));
  console.log(`${f.replace('.glb', '')}: ${res.ok ? 'eyes found' : res.why}`);
  if (res.ok) continue;
  failed.push(f);
  if (!out) continue;
  // texture + glossy texels in magenta + a 10% grid, for marking by hand
  const size = 1024;
  const base = await sharp(Buffer.from(mat.getBaseColorTexture().getImage())).resize(size, size, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const rough = await sharp(Buffer.from(roughTex.getImage())).resize(size, size, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  for (let p = 0; p < size * size; p++) {
    const x = p % size, y = Math.floor(p / size);
    if (rough[4 * p + 1] < 0.2 * 255) { base[4 * p] = 255; base[4 * p + 1] = 0; base[4 * p + 2] = 255; }
    if (x % (size / 10) === 0 || y % (size / 10) === 0) { base[4 * p] = 0; base[4 * p + 1] = 255; base[4 * p + 2] = 255; }
  }
  await sharp(base, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(out, f.replace('.glb', '.png')));
}
console.log(`${failed.length} without eyelids: ${failed.map(f => f.replace('.glb', '')).join(' ')}`);
