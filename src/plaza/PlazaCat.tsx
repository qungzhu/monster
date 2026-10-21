import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { toPlushMaterial } from '../components/pets/GLBPet';
import type { PlazaAction } from './protocol';

/** Plaza world placement: arena (x, z) -> world, on the snow clearing. */
export const ARENA_Z_OFFSET = 1;
export const GROUND_Y = -0.7;
const CAT_HEIGHT = 0.85;

export interface CatPose {
  x: number;
  z: number;
  ry: number;
  action: PlazaAction;
}

interface Props {
  url: string;
  /** Read every frame — the latest known pose (local sim or network). */
  getPose: () => CatPose | undefined;
  name: string;
  petName: string;
  isSelf?: boolean;
  /** Friendship badge shown before the pet name (🤝 💛 💖 💞). */
  badge?: string;
}

/**
 * One cat in the shared plaza, using the lightweight LOD model. Position
 * and heading are smoothed toward the latest pose so remote cats glide
 * instead of jumping at the 10 Hz network rate.
 */
export function PlazaCat({ url, getPose, name, petName, isSelf, badge }: Props) {
  const outer = useRef<THREE.Group>(null);
  const animRoot = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, animRoot);
  const current = useRef<PlazaAction | null>(null);

  // Plush material, per instance.
  useEffect(() => {
    clone.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m?.isMeshStandardMaterial) mesh.material = toPlushMaterial(m);
    });
  }, [clone]);

  // Fit to a uniform height with feet on the ground (skinning-aware, like GLBPet).
  const fit = useMemo(() => {
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    clone.traverse(o => {
      const sk = o as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh) return;
      sk.skeleton.update();
      const pos = sk.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += step) box.expandByPoint(sk.getVertexPosition(i, v).applyMatrix4(sk.matrixWorld));
    });
    if (box.isEmpty()) box.setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const s = CAT_HEIGHT / Math.max(size.y, 1e-4);
    return { s, x: -c.x * s, y: -box.min.y * s, z: -c.z * s };
  }, [clone]);

  const placed = useRef(false);

  useFrame((_, dt) => {
    const g = outer.current;
    const p = getPose();
    if (!g || !p) return;
    // First known pose: appear there directly (no slide-in from the origin).
    if (!placed.current) {
      g.position.set(p.x, GROUND_Y, p.z + ARENA_Z_OFFSET);
      g.rotation.y = p.ry;
      placed.current = true;
    }

    const k = isSelf ? 1 - Math.exp(-25 * dt) : 1 - Math.exp(-10 * dt);
    g.position.x += (p.x - g.position.x) * k;
    g.position.z += (p.z + ARENA_Z_OFFSET - g.position.z) * k;
    let d = p.ry - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest turn
    g.rotation.y += d * (1 - Math.exp(-12 * dt));

    if (current.current !== p.action) {
      const next = actions[p.action] ?? actions.Idle;
      const prev = current.current ? actions[current.current] : null;
      next?.reset().fadeIn(0.2).play();
      if (prev && prev !== next) prev.fadeOut(0.2);
      current.current = p.action;
    }
  });

  return (
    <group ref={outer}>
      <group ref={animRoot} position={[fit.x, fit.y, fit.z]} scale={fit.s}>
        <primitive object={clone} />
      </group>
      <Html position={[0, CAT_HEIGHT + 0.25, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div
          className="pointer-events-none whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ background: isSelf ? 'rgba(236,72,153,0.85)' : 'rgba(15,23,42,0.7)' }}
        >
          {badge ? `${badge} ` : ''}{petName}
          <span className="opacity-70"> · {isSelf ? '我' : name}</span>
        </div>
      </Html>
    </group>
  );
}
