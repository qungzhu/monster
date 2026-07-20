// Transfer a working rigged skeleton + all its animation clips onto a
// different (unriggable) mesh of similar proportions, by starting from the
// rigged GLB and swapping in the target's geometry + material, recomputing
// skin weights from bone rest positions. Keeps skeleton/skin/clips verbatim.
//
// usage: node transfer-skin.js <riggedBaseGlb> <bonePosJson> <targetGlb> <outGlb>
const path = require('path');
const fs = require('fs');
const { NodeIO } = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/core'));
const ALL = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/extensions'));

const [, , baseGlb, bonePosJson, targetGlb, outGlb] = process.argv;

function normalizePos(v, tmin, tmax, bmin, bmax) {
  // map target bbox -> base bbox per axis, uniform scale (min of axis scales)
  // to preserve proportions, then re-center in base bbox.
  const ts = [tmax[0] - tmin[0], tmax[1] - tmin[1], tmax[2] - tmin[2]];
  const bs = [bmax[0] - bmin[0], bmax[1] - bmin[1], bmax[2] - bmin[2]];
  const scale = Math.min(bs[0] / ts[0], bs[1] / ts[1], bs[2] / ts[2]);
  const tc = [(tmin[0] + tmax[0]) / 2, tmin[1], (tmin[2] + tmax[2]) / 2];
  const bc = [(bmin[0] + bmax[0]) / 2, bmin[1], (bmin[2] + bmax[2]) / 2];
  return [
    (v[0] - tc[0]) * scale + bc[0],
    (v[1] - tc[1]) * scale + bc[1],
    (v[2] - tc[2]) * scale + bc[2],
  ];
}

(async () => {
  const io = new NodeIO().registerExtensions(ALL.ALL_EXTENSIONS);
  const base = await io.read(baseGlb);
  const tgt = await io.read(targetGlb);
  const bonePos = JSON.parse(fs.readFileSync(bonePosJson)).bones;

  const skin = base.getRoot().listSkins()[0];
  const joints = skin.listJoints();
  const boneWorld = joints.map(j => bonePos[j.getName()]);
  // tip/face bones deform poorly under nearest-point weighting — exclude from
  // being chosen so body verts bind to structural bones, not head_end etc.
  const exclude = new Set(['head_end', 'headfront', 'LeftToeBase', 'RightToeBase']);
  const pickable = joints.map((j, i) => ({ i, p: boneWorld[i], ok: !exclude.has(j.getName()) }));

  const baseMeshNode = base.getRoot().listNodes().find(n => n.getSkin());
  const baseP = baseMeshNode.getMesh().listPrimitives()[0];
  const bmin = baseP.getAttribute('POSITION').getMin([]);
  const bmax = baseP.getAttribute('POSITION').getMax([]);

  const tgtP = tgt.getRoot().listMeshes()[0].listPrimitives()[0];
  const tpos = tgtP.getAttribute('POSITION');
  const tnorm = tgtP.getAttribute('NORMAL');
  const tuv = tgtP.getAttribute('TEXCOORD_0');
  const tidx = tgtP.getIndices();
  const tmin = tpos.getMin([]);
  const tmax = tpos.getMax([]);
  const n = tpos.getCount();

  const newPos = new Float32Array(n * 3);
  const newJoints = new Uint16Array(n * 4);
  const newWeights = new Float32Array(n * 4);
  const v = [0, 0, 0];
  for (let vi = 0; vi < n; vi++) {
    tpos.getElement(vi, v);
    const p = normalizePos(v, tmin, tmax, bmin, bmax);
    newPos[vi * 3] = p[0]; newPos[vi * 3 + 1] = p[1]; newPos[vi * 3 + 2] = p[2];
    // Smooth Gaussian falloff over all structural bones, keep top 4.
    // Smoothing across joint boundaries removes the hard skinning seams
    // (esp. the neck/chest junction) that nearest-N weighting produces.
    const SIGMA = 0.05; // ~1/7 of body height; blends adjacent joints
    const dists = [];
    for (const b of pickable) {
      if (!b.ok) continue;
      const dx = p[0] - b.p[0], dy = p[1] - b.p[1], dz = p[2] - b.p[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      dists.push([b.i, Math.exp(-d2 / (2 * SIGMA * SIGMA))]);
    }
    dists.sort((a, c) => c[1] - a[1]);
    let sum = 0;
    const w = [];
    for (let k = 0; k < 4; k++) { w.push(dists[k]); sum += dists[k][1]; }
    for (let k = 0; k < 4; k++) {
      newJoints[vi * 4 + k] = w[k][0];
      newWeights[vi * 4 + k] = w[k][1] / sum;
    }
  }

  // Build fresh attributes on the base document
  const posA = base.createAccessor().setType('VEC3').setArray(newPos);
  const normA = base.createAccessor().setType('VEC3').setArray(new Float32Array(tnorm.getArray()));
  const uvA = base.createAccessor().setType('VEC2').setArray(new Float32Array(tuv.getArray()));
  const jA = base.createAccessor().setType('VEC4').setArray(newJoints);
  const wA = base.createAccessor().setType('VEC4').setArray(newWeights);
  const idxA = base.createAccessor().setType('SCALAR').setArray(new Uint32Array(tidx.getArray()));

  // Reset primitive to exactly the attributes we control
  for (const s of baseP.listSemantics()) baseP.setAttribute(s, null);
  baseP.setAttribute('POSITION', posA);
  baseP.setAttribute('NORMAL', normA);
  baseP.setAttribute('TEXCOORD_0', uvA);
  baseP.setAttribute('JOINTS_0', jA);
  baseP.setAttribute('WEIGHTS_0', wA);
  baseP.setIndices(idxA);

  // Copy the target material's textures into the base doc
  const tmat = tgtP.getMaterial();
  const newMat = base.createMaterial('cat').setRoughnessFactor(1).setMetallicFactor(0);
  newMat.setBaseColorFactor(tmat.getBaseColorFactor());
  const copyTex = (getT, setT) => {
    const t = getT.call(tmat);
    if (!t) return;
    const tex = base.createTexture(t.getName() || 'tex')
      .setImage(t.getImage()).setMimeType(t.getMimeType());
    setT.call(newMat, tex);
  };
  copyTex(tmat.getBaseColorTexture, newMat.setBaseColorTexture);
  copyTex(tmat.getNormalTexture, newMat.setNormalTexture);
  copyTex(tmat.getMetallicRoughnessTexture, newMat.setMetallicRoughnessTexture);
  baseP.setMaterial(newMat);

  // Drop the old baseline clip; keep the 8 real ones
  for (const a of base.getRoot().listAnimations()) {
    if (a.getName().includes('clip0')) a.dispose();
  }

  const { prune, dedup } = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/functions'));
  await base.transform(prune(), dedup());
  await io.write(outGlb, base);
  console.log('transferred ->', outGlb, '| verts', n, '| clips',
    base.getRoot().listAnimations().map(a => a.getName()).join(','));
})();
