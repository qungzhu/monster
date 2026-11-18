// Fix skinning spikes in the rigged plush cats: a few vertices carry weights
// from the wrong bone (a chest vertex on the front leg, a sole on the other
// foot), so at the extremes of a run they are pulled out of the body as
// spikes and torn flaps. This plays every clip, finds edges that stretch far
// beyond their rest length, and gives their vertices the averaged weights of
// their well-behaved neighbours, repeating until nothing tears.
//
//   node scripts/fix-skin-spikes.mjs [name ...]   (public/models/plush/rigged)
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, meshopt, quantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { Matrix4, Quaternion, Vector3 } from 'three';

const dir = new URL('../public/models/plush/rigged/', import.meta.url).pathname;
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dir).filter(f => f.endsWith('.glb')).map(f => f.slice(0, -4));
const STRETCH = 2.2;   // edge longer than this x its rest length = torn
const SAMPLES = 24;    // poses checked per clip

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

function sampleChannel(sampler, t, out) {
  const input = sampler.getInput().getArray();
  const output = sampler.getOutput().getArray();
  const n = sampler.getOutput().getElementSize();
  const cubic = sampler.getInterpolation() === 'CUBICSPLINE';
  const stride = cubic ? 3 * n : n, base = cubic ? n : 0;
  let i = 0;
  while (i < input.length - 2 && input[i + 1] <= t) i++;
  const t0 = input[i], t1 = input[Math.min(i + 1, input.length - 1)];
  const f = sampler.getInterpolation() === 'STEP' || t1 <= t0 ? 0 : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const a = Array.from(output.slice(i * stride + base, i * stride + base + n));
  const j = Math.min(i + 1, input.length - 1);
  const b = Array.from(output.slice(j * stride + base, j * stride + base + n));
  if (n === 4) {
    out.set(...a).slerp(new Quaternion(...b), f);
  } else {
    for (let k = 0; k < n; k++) out[k] = a[k] + (b[k] - a[k]) * f;
  }
  return out;
}

for (const name of names) {
  const file = path.join(dir, `${name}.glb`);
  const doc = await io.read(file);
  await doc.transform(dequantize());
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  const meshNode = root.listNodes().find(n => n.getSkin() === skin && n.getMesh());
  if (!skin || !meshNode) { console.log(`${name}: no skin`); continue; }
  const joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices().getArray();
  const prims = meshNode.getMesh().listPrimitives().filter(p => p.getAttribute('JOINTS_0'));

  // Pose = joint world matrices for one moment of one clip.
  const allNodes = root.listNodes();
  const parentOf = new Map();
  for (const n of allNodes) for (const c of n.listChildren()) parentOf.set(c, n);
  function pose(anim, t) {
    const local = new Map();
    for (const n of allNodes) {
      local.set(n, { t: new Vector3(...n.getTranslation()), r: new Quaternion(...n.getRotation()), s: new Vector3(...n.getScale()) });
    }
    if (anim) {
      for (const ch of anim.listChannels()) {
        const node = ch.getTargetNode(), p = ch.getTargetPath(), L = local.get(node);
        if (!L) continue;
        if (p === 'rotation') sampleChannel(ch.getSampler(), t, L.r);
        else if (p === 'translation') { const v = sampleChannel(ch.getSampler(), t, [0, 0, 0]); L.t.set(v[0], v[1], v[2]); }
        else if (p === 'scale') { const v = sampleChannel(ch.getSampler(), t, [0, 0, 0]); L.s.set(v[0], v[1], v[2]); }
      }
    }
    const world = new Map();
    const getWorld = n => {
      if (world.has(n)) return world.get(n);
      const L = local.get(n);
      const m = new Matrix4().compose(L.t, L.r, L.s);
      const p = parentOf.get(n);
      if (p) m.premultiply(getWorld(p));
      world.set(n, m);
      return m;
    };
    return joints.map((j, k) => getWorld(j).clone().multiply(new Matrix4().fromArray(ibm, k * 16)));
  }

  const poses = [];
  for (const anim of root.listAnimations()) {
    const times = anim.listSamplers().flatMap(s => Array.from(s.getInput().getArray()));
    const end = Math.max(...times, 0);
    for (let k = 0; k < SAMPLES; k++) poses.push(pose(anim, (end * k) / SAMPLES));
  }

  let fixedTotal = 0;
  for (const prim of prims) {
    const P = prim.getAttribute('POSITION').getArray();
    const J = prim.getAttribute('JOINTS_0').getArray();
    const W = prim.getAttribute('WEIGHTS_0').getArray();
    const I = prim.getIndices().getArray();
    const n = P.length / 3;
    // Coincident vertices (UV seams) share weights; neighbours via edges.
    const key = i => `${P[3 * i].toFixed(5)},${P[3 * i + 1].toFixed(5)},${P[3 * i + 2].toFixed(5)}`;
    const group = new Map();
    for (let i = 0; i < n; i++) { const k = key(i); if (!group.has(k)) group.set(k, []); group.get(k).push(i); }
    const rep = new Int32Array(n);
    for (const ids of group.values()) for (const i of ids) rep[i] = ids[0];
    const nbr = new Map();
    const edges = new Set();
    for (let t = 0; t < I.length; t += 3) {
      const tri = [rep[I[t]], rep[I[t + 1]], rep[I[t + 2]]];
      for (let e = 0; e < 3; e++) {
        const a = tri[e], b = tri[(e + 1) % 3];
        if (a === b) continue;
        edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
        if (!nbr.has(a)) nbr.set(a, new Set());
        if (!nbr.has(b)) nbr.set(b, new Set());
        nbr.get(a).add(b); nbr.get(b).add(a);
      }
    }
    // Loose pieces (fur flakes, tufts) glued to the body: each piece takes
    // the averaged weights of the body skin nearest to it, so it moves as
    // one with the spot it sits on instead of drifting off on its own.
    {
      const comp = new Int32Array(n).fill(-1);
      const sizes = [];
      for (const s0 of new Set(rep)) {
        if (comp[s0] >= 0) continue;
        const id = sizes.length; let size = 0;
        const stack = [s0]; comp[s0] = id;
        while (stack.length) {
          const x = stack.pop(); size++;
          for (const y of nbr.get(x) ?? []) if (comp[y] < 0) { comp[y] = id; stack.push(y); }
        }
        sizes.push(size);
      }
      const main = sizes.indexOf(Math.max(...sizes));
      if (sizes.length > 1) {
        // grid of main-body vertices for nearest lookups
        let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[3 * i + k]); hi[k] = Math.max(hi[k], P[3 * i + k]); }
        const cell = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 60;
        const ck = (x, y, z) => `${Math.floor((x - lo[0]) / cell)},${Math.floor((y - lo[1]) / cell)},${Math.floor((z - lo[2]) / cell)}`;
        const grid = new Map();
        for (const i of new Set(rep)) {
          if (comp[i] !== main) continue;
          const k = ck(P[3 * i], P[3 * i + 1], P[3 * i + 2]);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(i);
        }
        const members = new Map();
        for (const i of new Set(rep)) if (comp[i] !== main) { if (!members.has(comp[i])) members.set(comp[i], []); members.get(comp[i]).push(i); }
        let glued = 0;
        for (const ids of members.values()) {
          const sum = new Map();
          for (const i of ids) {
            const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2];
            let near = [];
            for (let r = 1; r <= 6 && near.length < 6; r++) {
              near = [];
              const [gx, gy, gz] = ck(x, y, z).split(',').map(Number);
              for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
                for (const j of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) near.push(j);
              }
            }
            near = near.map(j => [j, (P[3 * j] - x) ** 2 + (P[3 * j + 1] - y) ** 2 + (P[3 * j + 2] - z) ** 2]).sort((p, q) => p[1] - q[1]).slice(0, 6);
            for (const [j] of near) for (let k = 0; k < 4; k++) {
              const w = W[4 * j + k];
              if (w) sum.set(J[4 * j + k], (sum.get(J[4 * j + k]) ?? 0) + w);
            }
          }
          if (!sum.size) continue;
          const top = [...sum.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
          const tot = top.reduce((t, [, w]) => t + w, 0);
          for (const i of ids) for (const c of group.get(key(i))) {
            for (let k = 0; k < 4; k++) { J[4 * c + k] = top[k]?.[0] ?? 0; W[4 * c + k] = (top[k]?.[1] ?? 0) / tot; }
          }
          glued++;
        }
        console.log(`  ${glued} loose pieces glued to the body`);
      }
    }
    const edgeList = [...edges].map(s => s.split('_').map(Number));
    const v = new Vector3(), acc = new Vector3(), tmp = new Vector3();
    const skinned = (i, mats, out) => {
      out.set(0, 0, 0);
      v.set(P[3 * i], P[3 * i + 1], P[3 * i + 2]);
      for (let k = 0; k < 4; k++) {
        const w = W[4 * i + k];
        if (w) out.add(tmp.copy(v).applyMatrix4(mats[J[4 * i + k]]).multiplyScalar(w));
      }
      return out;
    };
    const reps = [...new Set(rep)];
    const fixed = new Set();
    for (let round = 0; round < 6; round++) {
      const bad = new Set();
      const pos = new Float32Array(n * 3);
      for (const mats of poses) {
        for (const i of reps) { skinned(i, mats, acc); pos[3 * i] = acc.x; pos[3 * i + 1] = acc.y; pos[3 * i + 2] = acc.z; }
        for (const [a, b] of edgeList) {
          const rest = Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
          const now = Math.hypot(pos[3 * a] - pos[3 * b], pos[3 * a + 1] - pos[3 * b + 1], pos[3 * a + 2] - pos[3 * b + 2]);
          if (rest > 0 && now > STRETCH * rest + 1e-4) { bad.add(a); bad.add(b); }
        }
      }
      if (!bad.size) break;
      // New weights: average of the neighbours that are not torn (or of all
      // neighbours if every one is), top four joints, normalised.
      const next = new Map();
      for (const i of bad) {
        const ns = [...(nbr.get(i) ?? [])];
        const good = ns.filter(j => !bad.has(j));
        const use = good.length ? good : ns;
        const sum = new Map();
        for (const j of [...use, i]) for (let k = 0; k < 4; k++) {
          const w = W[4 * j + k];
          if (w) sum.set(J[4 * j + k], (sum.get(J[4 * j + k]) ?? 0) + w);
        }
        const top = [...sum.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
        const tot = top.reduce((s, [, w]) => s + w, 0) || 1;
        next.set(i, top.map(([j, w]) => [j, w / tot]));
      }
      for (const [i, top] of next) {
        for (const c of group.get(key(i))) {
          for (let k = 0; k < 4; k++) { J[4 * c + k] = top[k]?.[0] ?? 0; W[4 * c + k] = top[k]?.[1] ?? 0; }
        }
        fixed.add(i);
      }
    }
    prim.getAttribute('JOINTS_0').setArray(J);
    prim.getAttribute('WEIGHTS_0').setArray(W);
    fixedTotal += fixed.size;
  }
  await doc.transform(quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(file, doc);
  console.log(`${name}: reweighted ${fixedTotal} vertices`);
}
