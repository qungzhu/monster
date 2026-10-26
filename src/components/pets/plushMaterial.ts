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
  mat.onBeforeCompile = shader => {
    shader.uniforms.uPlushPerRadius = perRadius;
    shader.uniforms.uPlushFibres = plushTuning.fibresPerRadius;
    shader.uniforms.uPlushNoise = plushTuning.noise;
    shader.uniforms.uPlushWrap = plushTuning.wrap;
    shader.uniforms.uPlushRim = plushTuning.rim;
    shader.vertexShader = 'varying vec3 vPlushPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vPlushPos = position;',
    );
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
  mat.customProgramCacheKey = () => 'plush-v3';
  return mat;
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
  wrap: { value: 0.6 },
  /** Backlit rim glow strength. */
  rim: { value: 0.3 },
};
if (typeof window !== 'undefined' && window.location.search.includes('plushlab')) {
  (window as unknown as { __plush: typeof plushTuning }).__plush = plushTuning;
}
