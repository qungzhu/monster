// Add a swaying tail bone to a transferred-rig cat GLB.
// Detects the tail vertex cluster, inserts a bone under Hips whose bind
// world transform is axis-aligned at the tail base (so sway = clean rotation
// about the base), reweights tail verts with a base->tip falloff, and adds a
// gentle looping sway to every animation clip.
//
// usage: node add-tail-bone.cjs <inGlb> <outGlb> [tailZ] [tailYbase] [tailYtip]
const path = require('path');
const { NodeIO } = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/core'));
const ALL = require(path.resolve('/home/user/monster/node_modules/@gltf-transform/extensions'));
const THREE = require(path.resolve('/home/user/monster/node_modules/three'));

const [, , inGlb, outGlb, tailZarg, yBaseArg, yTipArg] = process.argv;
const TAIL_Z = tailZarg ? parseFloat(tailZarg) : 0.055;   // -z beyond this = tail
const Y_BASE = yBaseArg ? parseFloat(yBaseArg) : 0.15;    // tail exists above this
const smooth = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

(async () => {
  const io = new NodeIO().registerExtensions(ALL.ALL_EXTENSIONS);
  const doc = await io.read(inGlb);
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  const joints = skin.listJoints();
  const hips = joints.find(j => j.getName() === 'Hips');
  const arm = root.listNodes().find(n => n.getName() === 'Armature');

  const compose = (n) => new THREE.Matrix4().compose(
    new THREE.Vector3(...n.getTranslation()),
    new THREE.Quaternion(...n.getRotation()),
    new THREE.Vector3(...n.getScale()));
  const wHips = compose(arm).multiply(compose(hips));

  // ---- locate the tail cluster + its base attach point ----
  const prim = root.listMeshes()[0].listPrimitives()[0];
  const pos = prim.getAttribute('POSITION');
  const n = pos.getCount();
  const v = [0, 0, 0];
  let bx = 0, by = 0, bz = 0, bc = 0, yTip = 0, yLo = 9;
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v);
    if (-v[2] > TAIL_Z && v[1] > Y_BASE) {
      yTip = Math.max(yTip, v[1]); yLo = Math.min(yLo, v[1]);
      if (v[1] < Y_BASE + 0.05) { bx += v[0]; by += v[1]; bz += v[2]; bc++; }
    }
  }
  const tailBase = new THREE.Vector3(bx / bc, by / bc, bz / bc);
  const yMid = yTipArg ? parseFloat(yTipArg) : (yLo + yTip) / 2;
  // Horizontal radius of the tail column around its base axis — excludes the
  // ears (which also sit high and toward -z but spread wide in x / forward).
  const TAIL_R = 0.085;
  const inTail = (x, y, z) => -z > TAIL_Z && y > Y_BASE &&
    Math.hypot(x - tailBase.x, z - tailBase.z) < TAIL_R;
  console.log('tail base', tailBase.toArray().map(x => +x.toFixed(3)), 'yTip', yTip.toFixed(3));

  // ---- create the tail bone: bind world = axis-aligned translation at base ----
  const worldTbind = new THREE.Matrix4().makeTranslation(tailBase.x, tailBase.y, tailBase.z);
  const localT = new THREE.Matrix4().copy(wHips).invert().multiply(worldTbind);
  const lt = new THREE.Vector3(), lq = new THREE.Quaternion(), ls = new THREE.Vector3();
  localT.decompose(lt, lq, ls);
  const qBind = lq.clone(); // node's bind rotation (keeps tail put when sway=identity)

  const tailNode = doc.createNode('Tail')
    .setTranslation(lt.toArray()).setRotation(lq.toArray()).setScale(ls.toArray());
  hips.addChild(tailNode);

  // IBM = inverse(worldTbind) = translate(-base)
  const ibmT = new THREE.Matrix4().copy(worldTbind).invert();
  const oldIbm = skin.getInverseBindMatrices().getArray();
  const newIbm = new Float32Array(oldIbm.length + 16);
  newIbm.set(oldIbm);
  newIbm.set(ibmT.toArray(), oldIbm.length);
  skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(newIbm));
  skin.addJoint(tailNode);
  const tailIndex = joints.length; // appended last

  // ---- reweight tail verts toward the new bone (base->tip falloff) ----
  const jointsAttr = prim.getAttribute('JOINTS_0');
  const weightsAttr = prim.getAttribute('WEIGHTS_0');
  const J = jointsAttr.getArray().slice();
  const W = new Float32Array(weightsAttr.getArray());
  const ji = [0, 0, 0, 0], wt = [0, 0, 0, 0];
  let touched = 0;
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v);
    if (!inTail(v[0], v[1], v[2])) continue;
    // membership fade at the tail edges, plus base->tip drive amount
    const rFade = smooth(TAIL_R, TAIL_R - 0.03, Math.hypot(v[0] - tailBase.x, v[2] - tailBase.z));
    const member = smooth(TAIL_Z, TAIL_Z + 0.03, -v[2]) * rFade;
    const drive = smooth(Y_BASE + 0.02, yMid, v[1]); // 0 at attach, 1 up the tail
    const wTail = member * drive;
    if (wTail < 0.02) continue;
    for (let k = 0; k < 4; k++) { ji[k] = J[i * 4 + k]; wt[k] = W[i * 4 + k]; }
    // scale existing weights down, put wTail on the smallest slot as the tail bone
    let smin = 0; for (let k = 1; k < 4; k++) if (wt[k] < wt[smin]) smin = k;
    let rest = 0; for (let k = 0; k < 4; k++) if (k !== smin) { wt[k] *= (1 - wTail); rest += wt[k]; }
    ji[smin] = tailIndex; wt[smin] = wTail;
    const sum = rest + wTail || 1;
    for (let k = 0; k < 4; k++) { J[i * 4 + k] = ji[k]; W[i * 4 + k] = wt[k] / sum; }
    touched++;
  }
  jointsAttr.setArray(J);
  weightsAttr.setArray(W);
  console.log('tail verts reweighted:', touched);

  // ---- add a looping sway to every clip ----
  const swayQuat = new THREE.Quaternion(), tmpQ = new THREE.Quaternion(), e = new THREE.Euler();
  for (const anim of root.listAnimations()) {
    let dur = 0;
    for (const s of anim.listSamplers()) dur = Math.max(dur, s.getInput().getMax([])[0]);
    if (dur <= 0) dur = 1;
    const fps = 12, frames = Math.max(2, Math.round(dur * fps));
    const times = new Float32Array(frames + 1);
    const rots = new Float32Array((frames + 1) * 4);
    for (let f = 0; f <= frames; f++) {
      const t = (f / frames) * dur;
      const ph = (f / frames) * Math.PI * 2; // exactly one loop per clip
      const swishY = Math.sin(ph * 2) * 0.28;   // side-to-side swish
      const curlX = Math.sin(ph) * 0.14 - 0.05; // gentle up/down curl
      e.set(curlX, swishY, Math.sin(ph * 2) * 0.06, 'XYZ');
      swayQuat.setFromEuler(e);
      tmpQ.copy(qBind).multiply(swayQuat); // preserve bind orientation
      times[f] = t;
      rots[f * 4] = tmpQ.x; rots[f * 4 + 1] = tmpQ.y; rots[f * 4 + 2] = tmpQ.z; rots[f * 4 + 3] = tmpQ.w;
    }
    const input = doc.createAccessor().setType('SCALAR').setArray(times);
    const output = doc.createAccessor().setType('VEC4').setArray(rots);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler);
    anim.addChannel(doc.createAnimationChannel().setTargetNode(tailNode).setTargetPath('rotation').setSampler(sampler));
  }

  await io.write(outGlb, doc);
  console.log('tail bone added ->', outGlb);
})();
