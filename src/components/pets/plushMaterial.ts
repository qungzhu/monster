import * as THREE from 'three';

/**
 * Upgrade a smooth (plastic-looking) PBR surface to a plush fabric one:
 * MeshPhysicalMaterial + sheen gives cloth / velvet its soft fuzzy rim
 * instead of a hard specular highlight. Built by hand on purpose —
 * MeshPhysicalMaterial.copy(standardMat) throws (it reads physical-only
 * props off the plain source), which silently drops the pet to its
 * procedural fallback.
 */
export function toPlushMaterial(std: THREE.MeshStandardMaterial, mesh?: THREE.Mesh): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial();
  mat.name = std.name;
  mat.color.copy(std.color);
  mat.map = std.map;
  mat.normalMap = std.normalMap;
  mat.normalScale.copy(std.normalScale).multiplyScalar(0.4);
  mat.aoMap = std.aoMap;
  mat.aoMapIntensity = std.aoMapIntensity;
  mat.emissive.copy(std.emissive);
  mat.emissiveMap = std.emissiveMap;
  // Some Meshy exports (red fox, the Pixie-Bob) ship a full-strength
  // self-illumination: emissive [1,1,1] driven by the albedo texture, i.e.
  // the model glows in its own colour. Stacked on the studio lighting that
  // blows those pets out while emissive-free ones (ragdoll) look right.
  // Keep only a trace of it so every pet is lit by the same rules.
  mat.emissiveIntensity = std.emissiveMap ? 0.22 : std.emissiveIntensity;
  mat.alphaMap = std.alphaMap;
  mat.alphaTest = std.alphaTest;
  mat.transparent = std.transparent;
  mat.opacity = std.opacity;
  mat.side = std.side;
  mat.vertexColors = std.vertexColors; // euro tail COLOR_0 tint
  mat.roughness = 1;
  mat.metalness = 0;
  // Meshy bakes the eyes and nose as the only glossy texels of the
  // roughness map: shell fur uses it as a mask so they stay bare.
  mat.userData.furMask = std.roughnessMap ?? null;
  // Fabric has no hard spec highlight; the physical default white
  // specular blows out the lit side under the bright scene lights.
  mat.specularIntensity = 0;
  mat.sheen = 0.55;
  mat.sheenRoughness = 0.8; // broad, soft fabric lobe
  mat.sheenColor = new THREE.Color('#b8a898');
  // Let the studio softbox environment wrap the fabric (plush toys are
  // lit from everywhere, that's what makes them look soft). The scene-wide
  // environment is kept dim so the snow doesn't blow out; the pet boosts
  // it locally.
  mat.envMapIntensity = 2.8;
  // Fabric shading, all in the shader (no extra geometry, so it stays
  // cheap and has no outline artifacts):
  //  - pile: soft fibre noise in the albedo, anchored to the bind-pose
  //    surface so it doesn't swim when the cat moves, and faded out where
  //    a fibre would be smaller than a pixel (no sparkle/grain);
  //  - wrap lighting: light scatters into fabric, the terminator is soft;
  //  - backlit rim: silhouette fibres glow in their own colour.
  const radius = mesh?.geometry?.boundingSphere?.radius
    ?? (mesh?.geometry?.computeBoundingSphere(), mesh?.geometry?.boundingSphere?.radius) ?? 1;
  const perRadius = { value: 1 / Math.max(radius, 1e-4) };
  if (mesh?.geometry && !mesh.geometry.attributes.plushInflateNormal) {
    mesh.geometry.setAttribute('plushInflateNormal', smoothOutward(mesh.geometry, radius));
  }
  mat.onBeforeCompile = shader => {
    shader.uniforms.uPlushPerRadius = perRadius;
    shader.uniforms.uPlushFibres = plushTuning.fibresPerRadius;
    shader.uniforms.uPlushNoise = plushTuning.noise;
    shader.uniforms.uPlushWrap = plushTuning.wrap;
    shader.uniforms.uPlushRim = plushTuning.rim;
    shader.uniforms.uPlushInflate = plushTuning.inflate;
    // No mesh -> no welded normals: stuffing off (it would push sideways).
    shader.uniforms.uPlushRadius = { value: mesh?.geometry?.attributes.plushInflateNormal ? radius : 0 };
    // Stuffing: push the surface out along its (skinned) normal, so the cat
    // is plumper everywhere — like a toy with more filling. After skinning,
    // so it follows every pose.
    // Uses a spatially smoothed normal (plushInflateNormal), so seam copies
    // and separate fur pieces move together and the surface doesn't crack.
    shader.vertexShader = 'varying vec3 vPlushPos;\nuniform float uPlushInflate, uPlushRadius;\nattribute vec3 plushInflateNormal;\n' + shader.vertexShader
      .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
  vec3 plushN = plushInflateNormal;
  #ifdef USE_SKINNING
    plushN = vec4( skinMatrix * vec4( plushN, 0.0 ) ).xyz;
  #endif`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPlushPos = position;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  transformed += normalize(plushN + 1e-6) * uPlushInflate * uPlushRadius;');
    shader.fragmentShader = PLUSH_FRAGMENT_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 plushV = normalize(vViewPosition);
  // Orient against the true face (screen-space derivative), so a model with
  // inverted vertex normals can't read as edge-on everywhere.
  vec3 plushFace = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  vec3 plushN = normalize(vNormal);
  plushN *= sign(dot(plushN, plushFace) * dot(plushFace, plushV) + 1e-6);
  float plushNdV = clamp(dot(plushN, plushV), 0.0, 1.0);
  vec3 plushP = vPlushPos * uPlushPerRadius * uPlushFibres;
  float plushDetail = 1.0 - smoothstep(0.35, 1.1, length(fwidth(plushP)));
  float plushPile = mix(0.5, plushNoise(plushP) * 0.6 + plushNoise(plushP * 2.7 + 13.1) * 0.4, plushDetail);
  diffuseColor.rgb *= 1.0 + (plushPile - 0.5) * 2.0 * uPlushNoise;
`)
      .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
        'float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + uPlushWrap ) / ( 1.0 + uPlushWrap ) );')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += diffuseColor.rgb * pow(1.0 - plushNdV, 2.4) * uPlushRim;`);
  };
  mat.customProgramCacheKey = () => 'plush-v4';
  return mat;
}

/**
 * A smooth "outward" direction per vertex for the stuffing: normals averaged
 * over everything within a small radius in space, regardless of which piece
 * they belong to. Meshy meshes are split along UV seams and some fur is made
 * of separate little pieces; averaging spatially makes neighbours move
 * together, so inflating never cracks the surface.
 */
function smoothOutward(geo: THREE.BufferGeometry, radius: number): THREE.BufferAttribute {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const n = pos.count;
  const out = new Float32Array(n * 3);
  if (!nrm) return new THREE.BufferAttribute(out, 3);
  const cell = Math.max(radius * 0.04, 1e-6);
  const grid = new Map<string, number[]>();
  const cx = new Int32Array(n), cy = new Int32Array(n), cz = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    cx[i] = Math.floor(pos.getX(i) / cell); cy[i] = Math.floor(pos.getY(i) / cell); cz[i] = Math.floor(pos.getZ(i) / cell);
    const k = `${cx[i]},${cy[i]},${cz[i]}`;
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(i);
  }
  // Sum of normals per cell, then each vertex takes its 3x3x3 neighbourhood.
  const cellSum = new Map<string, [number, number, number]>();
  for (const [k, list] of grid) {
    let x = 0, y = 0, z = 0;
    for (const i of list) { x += nrm.getX(i); y += nrm.getY(i); z += nrm.getZ(i); }
    cellSum.set(k, [x, y, z]);
  }
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const c = cellSum.get(`${cx[i] + dx},${cy[i] + dy},${cz[i] + dz}`);
      if (c) { x += c[0]; y += c[1]; z += c[2]; }
    }
    const l = Math.hypot(x, y, z) || 1;
    out[3 * i] = x / l; out[3 * i + 1] = y / l; out[3 * i + 2] = z / l;
  }
  return new THREE.BufferAttribute(out, 3);
}

const PLUSH_FRAGMENT_HEAD = `
varying vec3 vPlushPos;
uniform float uPlushPerRadius, uPlushFibres, uPlushNoise, uPlushWrap, uPlushRim;
float plushHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float plushNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(plushHash(i), plushHash(i + vec3(1, 0, 0)), f.x), mix(plushHash(i + vec3(0, 1, 0)), plushHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(plushHash(i + vec3(0, 0, 1)), plushHash(i + vec3(1, 0, 1)), f.x), mix(plushHash(i + vec3(0, 1, 1)), plushHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

/**
 * Shared, live-tunable fabric settings (uniforms, so changing them needs no
 * recompile). `?plushlab` in the URL exposes them as window.__plush.
 */
export const plushTuning = {
  /** Fibre clumps across one bounding radius of the mesh. */
  fibresPerRadius: { value: 140 },
  /** Albedo variation of the pile, 0–1. */
  noise: { value: 0.12 },
  /** Wrap-lighting amount: 0 = Lambert, 1 = fully wrapped. */
  wrap: { value: 0.25 },
  /** Backlit rim glow strength. */
  rim: { value: 0.3 },
  /** Stuffing: how far the surface is pushed out, as a fraction of the mesh's radius. */
  inflate: { value: 0.035 },
};
if (typeof window !== 'undefined' && window.location.search.includes('plushlab')) {
  (window as unknown as { __plush: typeof plushTuning }).__plush = plushTuning;
}
