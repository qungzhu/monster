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
  | 'stretch' | 'pounce' | 'rub' | 'knead' | 'sploot';

/** Skeletal clips baked into rigged GLBs (Meshy auto-rig); emotes with a
 *  matching clip get real limb motion layered under the procedural path. */
const emoteClips: Partial<Record<EmoteKind, string>> = { run: 'Run', walk: 'Walk' };

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
        // Clone materials before mutating: SkeletonUtils.clone shares
        // them across instances, and tinting one pet must not recolor
        // every other pet using the same GLB.
        let mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'roughness' in mat) {
          mat = mat.clone();
          mat.roughness = Math.min(mat.roughness ?? 1, 0.9);
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
    action.reset().fadeIn(0.25).play();
    return () => {
      action.fadeOut(0.25);
    };
  }, [emote, actions]);

  // Procedural whole-body motion: idle bob, or a full emote for
  // static meshes (run laps, belly roll, grooming bow, happy wiggle).
  const emoteT = useRef(0);
  useFrame((state, delta) => {
    const g = emoteGroup.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (!emote) {
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
      // 匍匐捕猎: flatten low, butt-wiggle wind-up, spring forward, reset
      const c = e % 3.4;
      if (c < 1.9) {
        // stalking crouch, wiggle builds up before the leap
        const crouch = Math.min(1, c / 0.5);
        g.scale.y = 1 - 0.24 * crouch;
        g.rotation.z = Math.sin(c * 11) * 0.045 * Math.min(1, c / 1.2);
        g.position.z = 0.05 * crouch;
        g.position.y = 0;
      } else if (c < 2.5) {
        // the leap: arc up and forward
        const j = (c - 1.9) / 0.6;
        g.scale.y = 1 - 0.24 * (1 - j);
        g.position.y = Math.sin(j * Math.PI) * 0.42;
        g.position.z = 0.05 + j * 0.55;
        g.rotation.x = -0.25 * Math.sin(j * Math.PI);
      } else {
        // trot back to the start
        const b = (c - 2.5) / 0.9;
        g.position.z = 0.6 * (1 - b);
        g.position.y = Math.abs(Math.sin(b * Math.PI * 3)) * 0.05;
        g.scale.y = 1;
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
