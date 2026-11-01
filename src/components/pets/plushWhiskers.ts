import * as THREE from 'three';
import type { EyeInfo } from './plushEyes';

/**
 * Real-looking whiskers for the Meshy cats. Their own whiskers are
 * zero-thickness strips that rigging crumpled, so tools/blender/lite_rig.py
 * removes them; these grow new ones from the whisker pads, which sit at a
 * fixed place under the eyes: tapered, faintly translucent, gently
 * curved, three a side, carried by the head bone.
 */
export interface WhiskerInfo {
  /** Whisker-pad roots (mesh space), left then right. */
  pads: [THREE.Vector3, THREE.Vector3];
  /** Eye spacing, the face's unit of length. */
  unit: number;
  /** +1 / -1: which way the face points along Z. */
  front: number;
}

/** Finds the whisker pads from the eyes. */
export function findWhiskerPads(geometry: THREE.BufferGeometry, eyes: EyeInfo): WhiskerInfo | null {
  const pos = geometry.attributes.position;
  if (!pos) return null;
  geometry.computeBoundingSphere();
  const unit = Math.abs(eyes.a.x - eyes.b.x);
  if (unit < 1e-4) return null;
  const cx = (eyes.a.x + eyes.b.x) / 2;
  const eyeY = (eyes.a.y + eyes.b.y) / 2;
  const eyeZ = (eyes.a.z + eyes.b.z) / 2;
  const centre = geometry.boundingSphere!.center;
  const front = eyeZ >= centre.z ? 1 : -1;

  // Whisker pads: just beside and below the nose, on the front surface.
  const pads = [-1, 1].map(side => {
    const tx = cx + side * 0.36 * unit, ty = eyeY - 0.8 * unit;
    let best = -Infinity;
    const p = new THREE.Vector3(), out = new THREE.Vector3(tx, ty, eyeZ);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      if (Math.hypot(p.x - tx, p.y - ty) > 0.18 * unit) continue;
      const z = p.z * front;
      if (z > best) { best = z; out.copy(p); }
    }
    return out;
  }) as [THREE.Vector3, THREE.Vector3];

  return { pads, unit, front };
}

let sharedMaterial: THREE.MeshBasicMaterial | null = null;

/** Tapered, curved whisker tube along a quadratic arc. */
function whiskerGeometry(root: THREE.Vector3, dir: THREE.Vector3, length: number, width: number) {
  const tip = root.clone().addScaledVector(dir, length);
  const mid = root.clone().addScaledVector(dir, length * 0.5);
  mid.y += length * 0.05; // arcs up a touch, then droops to the tip
  tip.y -= length * 0.08;
  const curve = new THREE.QuadraticBezierCurve3(root, mid, tip);
  const segs = 12, radial = 4;
  const geo = new THREE.TubeGeometry(curve, segs, width, radial, false);
  const p = geo.attributes.position;
  const v = new THREE.Vector3(), centre = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, centre);
    const taper = 1 - 0.92 * t; // thick root, hair-fine tip
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(centre).multiplyScalar(taper).add(centre);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  return geo;
}

/** Builds the six whiskers in mesh space. */
export function buildWhiskers(info: WhiskerInfo): THREE.Group {
  sharedMaterial ??= new THREE.MeshBasicMaterial({
    color: new THREE.Color('#f4efe6'), transparent: true, opacity: 0.55, depthWrite: false,
  });
  const group = new THREE.Group();
  group.name = 'plush-whiskers';
  const length = 1.15 * info.unit, width = 0.007 * info.unit;
  info.pads.forEach((pad, k) => {
    const side = k === 0 ? -1 : 1;
    [0.16, 0.0, -0.16].forEach((lift, i) => {
      const dir = new THREE.Vector3(side, lift, -0.28 * info.front).normalize();
      const root = pad.clone().add(new THREE.Vector3(0, (1 - i) * 0.07 * info.unit, 0));
      const m = new THREE.Mesh(whiskerGeometry(root, dir, length * (1 - Math.abs(i - 1) * 0.12), width), sharedMaterial!);
      m.renderOrder = 20;
      group.add(m);
    });
  });
  return group;
}

/**
 * Hangs whiskers built in `mesh`'s space on its head bone (rigged cats),
 * or on the mesh itself, so they follow every head turn.
 */
export function attachWhiskers(mesh: THREE.Mesh, group: THREE.Group) {
  const skinned = mesh as THREE.SkinnedMesh;
  const bones = skinned.isSkinnedMesh ? skinned.skeleton?.bones ?? [] : [];
  const i = bones.findIndex(b => /^head$/i.test(b.name));
  if (i < 0) { mesh.add(group); return; }
  // vertex in bone space = boneInverse * bindMatrix * vertex
  group.applyMatrix4(new THREE.Matrix4().multiplyMatrices(skinned.skeleton.boneInverses[i], skinned.bindMatrix));
  bones[i].add(group);
}
