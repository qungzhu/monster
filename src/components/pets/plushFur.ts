import * as THREE from 'three';
import { plushTuning } from './plushMaterial';

/**
 * Real-time plush fur by shell texturing, the standard game technique for
 * fur and velvet: the fur mesh is drawn again as N slightly inflated shells
 * and each shell keeps only the fragments where a fibre passes through, so
 * the surface gets depth and the silhouette turns fuzzy.
 *
 * Fibres are placed in the mesh's bind-pose space (not UVs), so there are
 * no seams and they stay put when the cat moves. Works for skinned meshes:
 * shells share the skeleton and are pushed out along the skinned normal.
 * Blender plush cats get it on their `fur` mesh; Meshy cats (eyes baked
 * into the same mesh) get a short pile masked by their roughness map, see
 * `meshyFur`.
 */
export interface FurOptions {
  /** Number of shells (layers above the base surface). */
  shells?: number;
  /** Fur length as a fraction of the mesh's bounding radius. */
  length?: number;
  /** Fibres across one bounding radius. */
  density?: number;
  /** How much fibres droop at the tip (fraction of the length). */
  droop?: number;
}

const defaults: Required<FurOptions> = { shells: 14, length: 0.045, density: 150, droop: 0.25 };

/** Short velvet pile for the (heavy, ~50k-triangle) Meshy cats. */
export const meshyFur: FurOptions = { shells: 8, length: 0.022, density: 170, droop: 0.1 };

const FUR_HEAD = `
varying vec3 vFurPos;
varying float vFurLength;
uniform float uFurH, uFurDensity;
float furHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
`;

function shellMaterial(base: THREE.MeshPhysicalMaterial, h: number, perRadius: number, opts: Required<FurOptions>) {
  const m = base.clone();
  m.name = `${base.name}-fur-${h.toFixed(2)}`;
  const mask = (base.userData.furMask as THREE.Texture | null | undefined) ?? null;
  const uniforms = {
    uFurMask: { value: mask },
    uPlushInflate: plushTuning.inflate,
    uPlushRadius: { value: 1 / perRadius },
    uFurH: { value: h },
    uFurOffset: { value: h * opts.length / perRadius },
    uFurDroop: { value: opts.droop * opts.length / perRadius },
    uFurDensity: { value: opts.density * perRadius },
  };
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute float furLength;\nattribute vec3 plushInflateNormal;\nvarying vec3 vFurPos;\nvarying float vFurLength;\nuniform float uFurH, uFurOffset, uFurDroop, uPlushInflate, uPlushRadius;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFurPos = position;\n  vFurLength = furLength;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
  // Start from the stuffed (inflated) surface the base mesh is drawn at.
  if (dot(plushInflateNormal, plushInflateNormal) > 0.0) transformed += normalize(plushInflateNormal) * uPlushInflate * uPlushRadius;
  transformed += normalize(objectNormal) * uFurOffset * furLength;
  transformed.y -= uFurDroop * uFurH * uFurH * furLength;`);
    shader.fragmentShader = (mask ? '#define FUR_MASK\nuniform sampler2D uFurMask;\n' : '') + FUR_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  float furLen = vFurLength;
  #if defined(FUR_MASK) && defined(USE_MAP)
    // Sharp mask, plus a blurred one (coarser mip) so a bare margin rings
    // the eyes and the fibres never hang over them.
    furLen *= smoothstep(0.22, 0.4, min(texture2D(uFurMask, vMapUv).g, texture2D(uFurMask, vMapUv, 3.0).g + 0.12));
  #endif
  // Fibre cells: one jittered fibre per cell, thinner toward the tip.
  vec3 fp = vFurPos * uFurDensity;
  // The nearest fibre lives in one of the 2x2x2 cells around this point.
  vec3 cell0 = floor(fp) + step(0.5, fract(fp)) - 1.0;
  float best = 1e9;
  for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) for (int k = 0; k < 2; k++) {
    vec3 c = cell0 + vec3(i, j, k);
    vec3 jitter = vec3(furHash(c), furHash(c + 17.3), furHash(c + 41.7));
    best = min(best, length(fp - (c + jitter)));
  }
  // Short-fur areas (around the eyes and nose) simply have fewer layers.
  if (uFurH > furLen + 0.02) discard;
  float radius = 0.55 * (1.0 - uFurH * 0.8);
  if (best > radius) discard;
  // Self-shadowing: deeper layers a little darker, tips catch the light.
  diffuseColor.rgb *= mix(0.82, 1.06, uFurH);`);
  };
  m.customProgramCacheKey = () => `plush-fur-${mask ? 'm' : ''}${h.toFixed(3)}`;
  return m;
}

/**
 * Per-vertex fur length 0–1: short fur near the other (non-fur) parts —
 * eyes, nose — so they aren't buried, full length elsewhere.
 */
function furLengths(mesh: THREE.Mesh, features: THREE.Mesh[]) {
  const pos = mesh.geometry.attributes.position;
  const out = new Float32Array(pos.count).fill(1);
  mesh.updateWorldMatrix(true, false);
  const toLocal = mesh.matrixWorld.clone().invert();
  const spheres = features.map(f => {
    f.geometry.computeBoundingSphere();
    f.updateWorldMatrix(true, false);
    const s = f.geometry.boundingSphere!.clone().applyMatrix4(f.matrixWorld).applyMatrix4(toLocal);
    return s;
  });
  // Eyes are two lumps in one mesh: use per-vertex clusters, not one sphere.
  const pts: THREE.Vector3[] = [];
  for (const f of features) {
    const fp = f.geometry.attributes.position;
    const step = Math.max(1, Math.floor(fp.count / 300));
    const m = toLocal.clone().multiply(f.matrixWorld);
    for (let i = 0; i < fp.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(fp, i).applyMatrix4(m));
  }
  const reach = Math.max(...spheres.map(s => s.radius), 1e-4) * 0.35;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let d = Infinity;
    for (const p of pts) d = Math.min(d, v.distanceToSquared(p));
    d = Math.sqrt(d);
    out[i] = THREE.MathUtils.smoothstep(d, reach * 0.4, reach * 2.2) * 0.85 + 0.15;
  }
  return out;
}

/** Add fur shells to every mesh in `root` whose material is named `materialName`. */
export function addFurShells(root: THREE.Object3D, options: FurOptions = {}, materialName: string | null = 'fur') {
  const opts = { ...defaults, ...options };
  const targets: THREE.Mesh[] = [];
  const features: THREE.Mesh[] = [];
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.furShell) return;
    const name = (mesh.material as THREE.Material)?.name ?? '';
    // materialName null: every fabric mesh that carries a fur mask (Meshy).
    if (materialName === null ? !!(mesh.material as THREE.Material).userData?.furMask : name.startsWith(materialName)) targets.push(mesh);
    else features.push(mesh);
  });
  for (const mesh of targets) {
    // Re-applying (e.g. a new tint) replaces the old shells.
    for (const old of (mesh.userData.furShells as THREE.Mesh[] | undefined) ?? []) {
      old.removeFromParent();
      (old.material as THREE.Material).dispose();
    }
    mesh.userData.furShells = [];
    if (!mesh.geometry.attributes.furLength) {
      mesh.geometry.setAttribute('furLength', new THREE.BufferAttribute(furLengths(mesh, features), 1));
    }
    const base = mesh.material as THREE.MeshPhysicalMaterial;
    mesh.geometry.computeBoundingSphere();
    const perRadius = 1 / Math.max(mesh.geometry.boundingSphere?.radius ?? 1, 1e-4);
    for (let i = 1; i <= opts.shells; i++) {
      const mat = shellMaterial(base, i / opts.shells, perRadius, opts);
      let shell: THREE.Mesh;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        const sm = mesh as THREE.SkinnedMesh;
        const skinnedShell = new THREE.SkinnedMesh(mesh.geometry, mat);
        skinnedShell.bind(sm.skeleton, sm.bindMatrix);
        shell = skinnedShell;
      } else {
        shell = new THREE.Mesh(mesh.geometry, mat);
      }
      shell.name = `${mesh.name}-fur${i}`;
      shell.userData.furShell = true;
      shell.castShadow = false;
      shell.renderOrder = i;
      shell.position.copy(mesh.position);
      shell.quaternion.copy(mesh.quaternion);
      shell.scale.copy(mesh.scale);
      mesh.parent?.add(shell);
      mesh.userData.furShells.push(shell);
    }
  }
  return targets.length;
}
