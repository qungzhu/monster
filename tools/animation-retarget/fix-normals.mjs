// Recompute smooth vertex normals from the triangle winding.
//
// Some skin-transferred cats (cat3/cat4/cat5) came out with most vertex
// normals pointing *into* the body while the triangles face out: lighting
// is computed inside-out, so they look flat like vinyl, and any
// view-angle effect (sheen, rim, fuzz) breaks. Faces are accumulated per
// position (area-weighted), so UV-seam duplicates get identical normals and
// no seam lines appear.
//
//   node tools/animation-retarget/fix-normals.mjs in.glb out.glb [--check]
//
// Needs @gltf-transform/core + extensions resolvable (npm i --no-save).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [inGlb, outGlb, flag] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inGlb);

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), nrm = prim.getAttribute('NORMAL'), idx = prim.getIndices();
    if (!pos || !nrm || !idx) continue;
    const P = pos.getArray(), I = idx.getArray(), n = pos.getCount();

    // Weld by position so seam duplicates share one normal.
    const key = i => `${P[3 * i].toFixed(5)},${P[3 * i + 1].toFixed(5)},${P[3 * i + 2].toFixed(5)}`;
    const group = new Int32Array(n);
    const ids = new Map();
    for (let i = 0; i < n; i++) {
      const k = key(i);
      if (!ids.has(k)) ids.set(k, ids.size);
      group[i] = ids.get(k);
    }
    const acc = new Float64Array(ids.size * 3);
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const ux = P[3 * b] - P[3 * a], uy = P[3 * b + 1] - P[3 * a + 1], uz = P[3 * b + 2] - P[3 * a + 2];
      const vx = P[3 * c] - P[3 * a], vy = P[3 * c + 1] - P[3 * a + 1], vz = P[3 * c + 2] - P[3 * a + 2];
      // Cross product length = 2 × area: area-weighted by construction.
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      for (const v of [a, b, c]) { const g = group[v] * 3; acc[g] += fx; acc[g + 1] += fy; acc[g + 2] += fz; }
    }

    const old = nrm.getArray();
    const N = new Float32Array(n * 3);
    let flipped = 0;
    for (let i = 0; i < n; i++) {
      const g = group[i] * 3;
      const l = Math.hypot(acc[g], acc[g + 1], acc[g + 2]) || 1;
      N[3 * i] = acc[g] / l; N[3 * i + 1] = acc[g + 1] / l; N[3 * i + 2] = acc[g + 2] / l;
      if (N[3 * i] * old[3 * i] + N[3 * i + 1] * old[3 * i + 1] + N[3 * i + 2] * old[3 * i + 2] < 0) flipped++;
    }
    console.log(`${mesh.getName() || 'mesh'}: ${n} verts, ${(100 * flipped / n).toFixed(1)}% of old normals pointed the wrong way`);
    if (flag !== '--check') nrm.setArray(N);
  }
}
if (flag !== '--check') { await io.write(outGlb, doc); console.log('wrote', outGlb); }
