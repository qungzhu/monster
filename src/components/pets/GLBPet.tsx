import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { Group } from 'three';
import * as THREE from 'three';
import type { GLBModelConfig } from '../../data/petModels';
import { glbModels } from '../../data/petModels';

/** Procedural whole-body emotes for static meshes, modeled on real cat
 *  body language (奔跑/翻肚子/舔爪子/撒娇/伸懒腰/捕猎扑击/蹭蹭/踩奶/板鸭趴). */
export type EmoteKind =
  | 'run' | 'walk' | 'roll' | 'groom' | 'cute'
  | 'stretch' | 'pounce' | 'rub' | 'knead' | 'sploot'
  | 'eat' | 'sleep' | 'meow' | 'zoomies';

/** Skeletal clips baked into rigged GLBs (Meshy auto-rig + retargeted
 *  Catson clips). Moving emotes (run/walk) keep the procedural path on
 *  top of the clip; stationary ones let the skeleton act alone. */
const emoteClips: Partial<Record<EmoteKind, string>> = {
  run: 'Run', walk: 'Walk', zoomies: 'Run',
  groom: 'Scratch', eat: 'Eat', sleep: 'Sleep', meow: 'Meow', cute: 'Happy',
};
const movingEmotes = new Set<EmoteKind>(['run', 'walk', 'zoomies']);

/** A tiled "fuzz" normal map: fine value-noise micro-bumps that read as
 *  short fur/fabric fibres. Tiled densely over each surface it turns the
 *  smooth plastic shell into a soft plush nap. Built once, shared by all. */
const fuzzNormalMap = (() => {
  const S = 256;
  // hashed value noise -> smoothed heightfield
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  let h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // stack octaves: soft fur clumps + fibres
      h[y * S + x] = hash(x * 0.5, y * 0.5) * 0.6 + hash(x, y) * 0.4;
    }
  }
  // Blur the heightfield so it reads as soft fur undulation, not per-pixel
  // sand — this is what lets the relief be strong without looking grainy.
  const idx = (x: number, y: number) => ((y + S) % S) * S + ((x + S) % S);
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(S * S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += h[idx(x + dx, y + dy)];
        b[idx(x, y)] = s / 9;
      }
    }
    h = b;
  }
  const data = new Uint8Array(S * S * 4);
  const at = (x: number, y: number) => h[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const strength = 5.0; // deeper relief (safe now the field is blurred)
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * S + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(26, 26);   // fur-clump scale
  tex.needsUpdate = true;
  return tex;
})();


/** Zoomies (FRAP) choreography, from real cat behavior research: chaotic
 *  sprint → freeze → pivot → sprint cycles with a stiff-legged, arched-back
 *  sideways crab-hop mixed in. Waypoints loop every 4s. */
const zoomiesPath: Array<{ t: number; x: number; z: number; mode: 'sprint' | 'freeze' | 'crab' }> = [
  { t: 0.0, x: -0.7, z: -0.5, mode: 'sprint' },
  { t: 0.8, x: 0.65, z: -0.75, mode: 'freeze' },
  { t: 1.1, x: 0.65, z: -0.75, mode: 'sprint' },
  { t: 1.9, x: -0.5, z: -0.9, mode: 'crab' },
  { t: 2.9, x: 0.1, z: -0.45, mode: 'sprint' },
  { t: 4.0, x: -0.7, z: -0.5, mode: 'sprint' },
];

interface GLBPetProps {
  config: GLBModelConfig;
  isHovered: boolean;
  /** Multiplied into every material color — '#ffffff' keeps the original look. */
  tint?: string;
  /** Auto-fit models of unknown size (e.g. Meshy generations): scale to
   *  ~1.3 units tall and rest the feet on the ground plane. */
  normalize?: boolean;
  /** Procedural whole-body emote for static meshes (no skeleton needed). */
  emote?: EmoteKind | null;
}

/**
 * Renders a professional skinned GLB model with animation blending.
 * Idle animation loops by default; hovering cross-fades to the hover
 * animation and back. The scene graph is cloned per instance so the
 * same GLB can appear in several canvases at once.
 */
export function GLBPet({ config, isHovered, tint, normalize, emote }: GLBPetProps) {
  const group = useRef<Group>(null);
  const emoteGroup = useRef<Group>(null);
  const { scene, animations } = useGLTF(config.url);

  // SkeletonUtils.clone keeps skinned meshes bound to their own bone copies
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  // Auto-fit unknown-size models: uniform scale to target height and
  // shift so the lowest point rests at local y=0 (group adds yOffset).
  const fit = useMemo(() => {
    if (!normalize) return null;
    // Skinned meshes render at joint-transformed positions which can be in
    // a completely different scale than the stored geometry (Meshy rigs use
    // cm-scale skeletons), so measure with skinning-aware vertex sampling.
    clonedScene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let sawSkinned = false;
    clonedScene.traverse(obj => {
      const skinned = obj as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh) {
        sawSkinned = true;
        skinned.skeleton.update();
        const pos = skinned.geometry.attributes.position;
        const step = Math.max(1, Math.floor(pos.count / 2000));
        for (let i = 0; i < pos.count; i += step) {
          skinned.getVertexPosition(i, v).applyMatrix4(skinned.matrixWorld);
          box.expandByPoint(v);
        }
      }
    });
    if (!sawSkinned) box.setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const height = Math.max(size.y, 0.0001);
    const scale = 1.3 / height;
    const center = new THREE.Vector3();
    box.getCenter(center);
    return { scale, offsetX: -center.x * scale, offsetY: -box.min.y * scale, offsetZ: -center.z * scale };
  }, [clonedScene, normalize]);

  useEffect(() => {
    const tintColor = tint ? new THREE.Color(tint) : null;
    clonedScene.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        const mesh = obj as THREE.Mesh;
        const std = mesh.material as THREE.MeshStandardMaterial;
        if (std && 'roughness' in std) {
          // Upgrade the smooth (plastic-looking) PBR surface to a fabric one:
          // MeshPhysicalMaterial + sheen is what gives cloth / plush / velvet
          // its soft fuzzy rim instead of a hard specular highlight.
          // NOTE: build it by hand — MeshPhysicalMaterial.copy(standardMat)
          // throws (reads physical-only props off the plain source), which
          // silently drops the pet to its procedural fallback.
          const mat = new THREE.MeshPhysicalMaterial();
          mat.color.copy(std.color);
          mat.map = std.map;
          // Replace the (soft, low-detail) Meshy normal with the dense fuzz
          // nap so the whole surface has fine fur relief.
          mat.normalMap = fuzzNormalMap;
          mat.normalScale.set(0.85, 0.85);
          mat.aoMap = std.aoMap;
          mat.aoMapIntensity = std.aoMapIntensity;
          mat.emissive.copy(std.emissive);
          mat.emissiveMap = std.emissiveMap;
          mat.alphaMap = std.alphaMap;
          mat.transparent = std.transparent;
          mat.opacity = std.opacity;
          mat.side = std.side;
          mat.vertexColors = std.vertexColors; // euro tail COLOR_0 tint
          mat.roughness = 1;
          mat.metalness = 0;
          // Fabric has no hard spec highlight; the physical default white
          // specular blows out the lit side under the bright scene lights.
          mat.specularIntensity = 0;
          mat.sheen = 1;
          mat.sheenRoughness = 0.7;
          mat.sheenColor = new THREE.Color('#cec2b2');
          mat.envMapIntensity = 0.16;
          if (tintColor) mat.color.copy(tintColor);
          mesh.material = mat;
        }
      }
    });
  }, [clonedScene, tint]);

  useEffect(() => {
    const idle = actions[config.idleAnimation];
    const hover = actions[config.hoverAnimation];
    const target = isHovered && hover ? hover : idle;
    const other = isHovered && hover ? idle : hover;

    if (!target) return;
    mixer.timeScale = config.timeScale ?? 1;
    target.reset().fadeIn(0.3).play();
    other?.fadeOut(0.3);

    return () => {
      target.fadeOut(0.3);
    };
  }, [actions, mixer, isHovered, config]);

  // Skeletal emote layer: rigged models play their real Walk/Run clip
  // while the procedural layer below moves the whole body along a path.
  useEffect(() => {
    const clip = emote && emoteClips[emote];
    const action = clip ? actions[clip] : null;
    if (!action) return;
    const idle = config.idleAnimation ? actions[config.idleAnimation] : null;
    idle?.fadeOut(0.25);
    action.reset().fadeIn(0.25).play();
    return () => {
      action.fadeOut(0.3);
      idle?.reset().fadeIn(0.3).play();
    };
  }, [emote, actions, config]);

  // Procedural whole-body motion: idle bob, or a full emote for
  // static meshes (run laps, belly roll, grooming bow, happy wiggle).
  const emoteT = useRef(0);
  useFrame((state, delta) => {
    const g = emoteGroup.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // A stationary emote backed by a real skeletal clip needs no fake
    // whole-body motion — ease the group home and let the bones act.
    const skeletalOnly = emote && !movingEmotes.has(emote) && !!actions[emoteClips[emote] ?? ''];

    if (!emote || skeletalOnly) {
      emoteT.current = 0;
      g.position.x = THREE.MathUtils.damp(g.position.x, 0, 4, delta);
      g.position.z = THREE.MathUtils.damp(g.position.z, 0, 4, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, isHovered ? 0 : Math.sin(t * 1.2) * 0.015, 6, delta);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0, 5, delta);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, 0, 5, delta);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0, 4, delta);
      g.scale.x = THREE.MathUtils.damp(g.scale.x, 1, 5, delta) || 1;
      g.scale.y = THREE.MathUtils.damp(g.scale.y, 1, 5, delta) || 1;
      g.scale.z = THREE.MathUtils.damp(g.scale.z, 1, 5, delta) || 1;
      return;
    }

    emoteT.current += delta;
    const e = emoteT.current;

    if (emote === 'run' || emote === 'walk') {
      // Laps on an ellipse pushed away from the camera so the cat never
      // fills the screen; face along the velocity vector. When the model
      // has a real skeletal gait clip the fake bounce/lean stays subtle.
      const hasClip = !!actions[emoteClips[emote]!];
      const run = emote === 'run';
      const R = 0.72, ZR = 0.32, w = run ? 2.4 : 0.9;
      const bounce = hasClip ? 0.02 : run ? 0.13 : 0.04;
      const stride = run ? 9 : 4.5;
      g.position.x = Math.sin(e * w) * R;
      g.position.z = -0.65 + Math.cos(e * w) * ZR;
      g.position.y = Math.abs(Math.sin(e * stride)) * bounce;
      g.rotation.y = Math.atan2(R * Math.cos(e * w), -ZR * Math.sin(e * w));
      g.rotation.z = (hasClip ? 0.03 : 0.12) * Math.sin(e * stride);
      g.rotation.x = run ? -0.08 : 0;
    } else if (emote === 'roll') {
      // Flop over and show the belly, wiggling side to side
      const settle = Math.min(1, e / 0.6);
      g.rotation.z = settle * 2.35 + Math.sin(e * 5) * 0.08 * settle;
      g.rotation.y = Math.sin(e * 2.2) * 0.25 * settle;
      g.position.y = 0.52 * settle + Math.sin(e * 5) * 0.03;
      g.position.x = 0; g.position.z = 0.1 * settle;
    } else if (emote === 'groom') {
      // Grooming bow: dip the head end down rhythmically like licking a paw
      const dip = (Math.sin(e * 3.2) + 1) / 2;
      g.rotation.x = 0.32 * dip;
      g.rotation.y = 0.35;
      g.position.y = -0.05 * dip;
      g.rotation.z = 0.05 * Math.sin(e * 6.4);
    } else if (emote === 'cute') {
      // Act cute: puppy-eye tilt, little hops, tail-end wiggle
      g.rotation.z = Math.sin(e * 2.6) * 0.18;
      g.rotation.x = -0.06 + Math.sin(e * 5.2) * 0.04;
      g.position.y = Math.max(0, Math.sin(e * 4.5)) * 0.09;
      g.rotation.y = Math.sin(e * 1.3) * 0.2;
      g.scale.setScalar(1 + Math.sin(e * 4.5) * 0.02);
    } else if (emote === 'stretch') {
      // 伸懒腰: slow bow — chest down, rump up, spine elongated, then release
      const s = Math.min(1, e / 1.1) * (e < 4 ? 1 : Math.max(0, 1 - (e - 4) / 0.8));
      g.rotation.x = 0.34 * s;
      g.position.y = 0.1 * s;
      g.scale.z = 1 + 0.16 * s;
      g.scale.y = 1 - 0.07 * s;
      g.rotation.z = 0.03 * Math.sin(e * 1.6) * s;
    } else if (emote === 'pounce') {
      // Predatory sequence per real cat biomechanics: slow stalk creep,
      // butt-wiggle that RAMPS UP right before launch (muscle priming),
      // explosive both-hind-legs leap, landing freeze to reassess, reset.
      const c = e % 4.2;
      if (c < 1.2) {
        // stalk: creep forward low and slow, eyes locked
        const s = Math.min(1, c / 0.4);
        g.scale.y = 1 - 0.24 * s;
        g.position.z = (c / 1.2) * 0.12;
        g.position.y = 0;
        g.rotation.x = 0.04 * s;
      } else if (c < 2.0) {
        // wind-up: hindquarter wiggle accelerating toward launch
        const w = (c - 1.2) / 0.8;
        g.scale.y = 0.76 - 0.04 * w;
        g.position.z = 0.12;
        g.rotation.z = Math.sin(c * (8 + w * 10)) * (0.03 + 0.05 * w);
        g.rotation.y = Math.sin(c * (8 + w * 10)) * 0.04;
      } else if (c < 2.5) {
        // explosive leap: fast rise, forward arc
        const j = (c - 2.0) / 0.5;
        g.scale.y = 0.72 + 0.38 * Math.min(1, j * 2.5);
        g.position.y = Math.sin(j * Math.PI) * 0.48;
        g.position.z = 0.12 + j * 0.6;
        g.rotation.x = -0.3 * Math.sin(j * Math.PI);
        g.rotation.z = 0;
      } else if (c < 3.2) {
        // landing freeze: crouched, motionless, reassessing the "prey"
        g.position.z = 0.72;
        g.position.y = 0;
        g.scale.y = 0.85;
        g.rotation.x = 0.06;
      } else {
        // trot back to the start
        const b = (c - 3.2) / 1.0;
        g.position.z = 0.72 * (1 - b);
        g.position.y = Math.abs(Math.sin(b * Math.PI * 3)) * 0.05;
        g.scale.y = 0.85 + 0.15 * b;
        g.rotation.x = 0;
      }
    } else if (emote === 'zoomies') {
      // FRAP: follow the chaotic waypoint choreography
      const c = e % 4.0;
      let i = 0;
      while (i < zoomiesPath.length - 2 && zoomiesPath[i + 1].t <= c) i++;
      const a = zoomiesPath[i], b = zoomiesPath[i + 1];
      const f = Math.min(1, (c - a.t) / Math.max(0.001, b.t - a.t));
      const x = a.x + (b.x - a.x) * f;
      const z = a.z + (b.z - a.z) * f;
      const dx = b.x - a.x, dz = b.z - a.z;
      g.position.x = x;
      g.position.z = z;
      const heading = Math.atan2(dx, dz);
      if (a.mode === 'sprint') {
        g.position.y = Math.abs(Math.sin(e * 11)) * 0.12;
        g.rotation.y = heading;
        g.rotation.x = -0.1;
        g.rotation.z = 0.1 * Math.sin(e * 11);
        g.scale.y = 1;
      } else if (a.mode === 'freeze') {
        // sudden stop: upright, alert, tiny pant
        g.position.y = 0;
        g.rotation.x = -0.05;
        g.rotation.z = 0;
        g.scale.y = 1 + Math.sin(e * 8) * 0.01;
      } else {
        // crab-hop: stiff legs, arched back, body sideways to travel
        g.position.y = Math.abs(Math.sin(e * 7)) * 0.17;
        g.rotation.y = heading + Math.PI / 2;
        g.rotation.x = 0.12;
        g.scale.y = 1.06;
        g.rotation.z = 0.05 * Math.sin(e * 7);
      }
    } else if (emote === 'rub') {
      // 蹭蹭你: sidle up close and rub a cheek side to side
      const s = Math.min(1, e / 0.8);
      g.position.z = 0.45 * s;
      g.rotation.z = Math.sin(e * 2.4) * 0.22 * s;
      g.rotation.y = Math.sin(e * 2.4) * 0.3 * s;
      g.position.x = Math.sin(e * 2.4) * 0.08 * s;
      g.rotation.x = 0.08 * s;
    } else if (emote === 'knead') {
      // 踩奶: contented kneading — weight shifts left-right on the front paws
      const s = Math.min(1, e / 0.6);
      g.rotation.z = Math.sin(e * 3.6) * 0.07 * s;
      g.rotation.x = 0.1 * s;
      g.position.y = Math.abs(Math.sin(e * 3.6)) * 0.025 * s;
      g.rotation.y = Math.sin(e * 0.9) * 0.08 * s;
    } else if (emote === 'sploot') {
      // 板鸭趴: flatten onto the belly, limbs out, slow contented breathing
      const s = Math.min(1, e / 0.9);
      g.scale.y = 1 - 0.3 * s + Math.sin(e * 1.8) * 0.012 * s;
      g.scale.x = 1 + 0.07 * s;
      g.scale.z = 1 + 0.05 * s;
      g.position.y = 0;
      g.rotation.y = Math.sin(e * 0.5) * 0.05 * s;
    } else if (emote === 'eat') {
      // 吃饭 fallback: rhythmic munching bow toward the ground
      const s = Math.min(1, e / 0.6);
      const dip = (Math.sin(e * 2.6) + 1) / 2;
      g.rotation.x = 0.3 * dip * s;
      g.position.y = -0.06 * dip * s;
    } else if (emote === 'sleep') {
      // 睡觉 fallback: settle low with slow breathing
      const s = Math.min(1, e / 1.2);
      g.scale.y = 1 - 0.22 * s + Math.sin(e * 1.4) * 0.015 * s;
      g.rotation.z = 0.12 * s;
      g.position.y = 0;
    } else if (emote === 'meow') {
      // 喵叫 fallback: lift the head with little calls
      const s = Math.min(1, e / 0.4);
      g.rotation.x = (-0.18 + Math.sin(e * 4) * 0.05) * s;
      g.position.y = 0.03 * s;
    }
  });

  if (fit) {
    return (
      <group ref={group} position={[0, config.yOffset, 0]} rotation={[0, config.rotationY ?? 0, 0]}>
        <group ref={emoteGroup}>
          <group position={[fit.offsetX, fit.offsetY, fit.offsetZ]} scale={fit.scale}>
            <primitive object={clonedScene} />
          </group>
        </group>
      </group>
    );
  }

  return (
    <group
      ref={group}
      position={[0, config.yOffset, 0]}
      rotation={[0, config.rotationY ?? 0, 0]}
      scale={config.scale}
    >
      <group ref={emoteGroup}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// Preload every registered GLB so the first render doesn't hitch
Object.values(glbModels).forEach(m => useGLTF.preload(m.url));
