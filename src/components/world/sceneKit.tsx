import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import { canvasTexture, GROUND, rng } from './sceneUtils';

/**
 * Shared pieces for the living-world scenes: ground, trees, flowers,
 * butterflies, fire and floating lights. All
 * procedural (no downloads), so every scene loads instantly.
 */
export function Ground({ map, color = '#ffffff', radius = 18, roughness = 0.95 }: { map?: THREE.Texture; color?: string; radius?: number; roughness?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND, 0]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={map} color={color} roughness={roughness} />
    </mesh>
  );
}

/** Soft rolling hill (a squashed sphere half under the ground). */
export function Hill({ position, scale, color, map }: { position: [number, number, number]; scale: [number, number, number]; color: string; map?: THREE.Texture }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 40, 24]} />
      <meshStandardMaterial color={color} map={map} roughness={0.95} />
    </mesh>
  );
}

/** Tall narrow spruce (Tianshan / Hokkaido forests). */
export function Spruce({ position, scale = 1, color = '#24442f', snow }: { position: [number, number, number]; scale?: number; color?: string; snow?: boolean }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.3, 8]} />
        <meshStandardMaterial color="#3b2b20" roughness={1} />
      </mesh>
      {[0.45, 0.8, 1.12, 1.4].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]}>
            <coneGeometry args={[0.36 - i * 0.075, 0.55, 14]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          {snow && (
            <mesh position={[0, y + 0.12, 0]}>
              <coneGeometry args={[0.27 - i * 0.06, 0.26, 14]} />
              <meshStandardMaterial color="#f4f7fc" roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Round leafy tree (parks, gardens). */
export function LeafyTree({ position, scale = 1, color = '#5b8c3e', trunk = '#6b4a33' }: { position: [number, number, number]; scale?: number; color?: string; trunk?: string }) {
  const blobs = useMemo(() => {
    const r = rng(Math.round(position[0] * 100 + position[2] * 7));
    return Array.from({ length: 6 }, () => [(r() - 0.5) * 0.7, 1.15 + r() * 0.45, (r() - 0.5) * 0.6, 0.38 + r() * 0.2] as const);
  }, [position]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1, 8]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      {blobs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 2]} />
          <meshStandardMaterial color={color} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** White birch with dark marks (Hokkaido). */
export function Birch({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const bark = canvasTexture('birch', 64, 1, (c, s) => {
    const r = rng(7);
    c.fillStyle = '#efeae2';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#2d2a28';
    for (let i = 0; i < 16; i++) c.fillRect(r() * s, r() * s, 4 + r() * 14, 1 + r() * 3);
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 2.2, 8]} />
        <meshStandardMaterial map={bark} roughness={0.9} />
      </mesh>
      {[[0.15, 1.7, 0.4], [-0.12, 1.4, -0.5], [0.05, 1.95, 0.1]].map(([x, y, rz], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0, 0, rz]}>
          <cylinderGeometry args={[0.012, 0.02, 0.6, 5]} />
          <meshStandardMaterial color="#d9d2c6" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Many small flowers on one draw call, scattered over an area. */
export function FlowerField({ count, colors, area, seed, avoid = 1.2, size = 0.05, height = 0.12 }: {
  count: number; colors: string[]; area: [number, number, number, number]; seed: number; avoid?: number; size?: number; height?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; z: number; s: number; c: THREE.Color }[] = [];
    while (out.length < count) {
      const x = area[0] + r() * (area[1] - area[0]);
      const z = area[2] + r() * (area[3] - area[2]);
      if (Math.hypot(x, z) < avoid) continue;
      out.push({ x, z, s: 0.7 + r() * 0.6, c: new THREE.Color(colors[Math.floor(r() * colors.length)]) });
    }
    return out;
  }, [count, colors, area, seed, avoid]);
  useLayoutEffect(() => {
    {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      data.forEach((f, i) => {
        sc.setScalar(size * f.s);
        m.compose(v.set(f.x, GROUND + height * f.s, f.z), q, sc);
        ref.current?.setMatrixAt(i, m);
        ref.current?.setColorAt(i, f.c);
        sc.set(0.008, height * f.s, 0.008);
        m.compose(v.set(f.x, GROUND + height * f.s / 2, f.z), q, sc);
        stems.current?.setMatrixAt(i, m);
      });
      if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; }
      if (stems.current) stems.current.instanceMatrix.needsUpdate = true;
    }
  }, [data, size, height]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={stems} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 4]} />
        <meshStandardMaterial color="#4f7a36" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** Grass tufts (thin cones), one draw call. */
export function GrassTufts({ count, color, area, seed, avoid = 1.1 }: { count: number; color: string; area: [number, number, number, number]; seed: number; avoid?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    {
      const r = rng(seed);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
      let i = 0;
      while (i < count) {
        const x = area[0] + r() * (area[1] - area[0]), z = area[2] + r() * (area[3] - area[2]);
        if (Math.hypot(x, z) < avoid) continue;
        const h = 0.08 + r() * 0.12;
        q.setFromEuler(e.set((r() - 0.5) * 0.4, r() * 6, (r() - 0.5) * 0.4));
        m.compose(v.set(x, GROUND + h / 2, z), q, s.set(0.02, h, 0.02));
        ref.current?.setMatrixAt(i++, m);
      }
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, area, seed, avoid]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <coneGeometry args={[1, 1, 3]} />
      <meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}

/** Butterflies fluttering along looping paths. */
export function Butterflies({ count = 7, colors = ['#f9a8d4', '#fde047', '#93c5fd', '#fdba74', '#c4b5fd'] }: { count?: number; colors?: string[] }) {
  const group = useRef<THREE.Group>(null);
  const bugs = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: count }, (_, i) => ({
      cx: (r() - 0.5) * 5, cz: -0.5 - r() * 3, rx: 0.6 + r() * 1.2, rz: 0.4 + r() * 0.8,
      y: 0.1 + r() * 0.9, speed: 0.25 + r() * 0.35, phase: r() * 6, color: colors[i % colors.length],
    }));
  }, [count, colors]);
  useFrame(state => {
    const t = state.clock.elapsedTime;
    group.current?.children.forEach((b, i) => {
      const k = bugs[i];
      const a = t * k.speed + k.phase;
      b.position.set(k.cx + Math.cos(a) * k.rx, k.y + Math.sin(t * 1.7 + k.phase) * 0.15, k.cz + Math.sin(a) * k.rz);
      b.rotation.y = -a;
      const flap = Math.sin(t * 18 + k.phase) * 0.9;
      b.children[0].rotation.z = flap;
      b.children[1].rotation.z = -flap;
    });
  });
  return (
    <group ref={group}>
      {bugs.map((b, i) => (
        <group key={i} scale={0.07}>
          {[1, -1].map(side => (
            <mesh key={side} position={[side * 0.5, 0, 0]}>
              <circleGeometry args={[0.6, 12]} />
              <meshStandardMaterial color={b.color} side={THREE.DoubleSide} emissive={b.color} emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Flickering fire with a warm light (fireplace, campfire). */
export function Fire({ position, scale = 1, light = 2.2 }: { position: [number, number, number]; scale?: number; light?: number }) {
  const flames = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(state => {
    const t = state.clock.elapsedTime;
    flames.current?.children.forEach((f, i) => {
      const s = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 23 + i) * 0.06;
      f.scale.set(1, s, 1);
    });
    if (glow.current) glow.current.intensity = light * (0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 27) * 0.05);
  });
  return (
    <group position={position} scale={scale}>
      <group ref={flames}>
        {[['#ff7a1a', 0.16, 0.42, 0], ['#ffb02e', 0.11, 0.32, 0.03], ['#fff1a8', 0.06, 0.2, 0.05]].map(([c, r, h, z], i) => (
          <mesh key={i} position={[0, (h as number) / 2, z as number]}>
            <coneGeometry args={[r as number, h as number, 10]} />
            <meshBasicMaterial color={c as string} toneMapped={false} transparent opacity={0.92} />
          </mesh>
        ))}
      </group>
      <pointLight ref={glow} position={[0, 0.3, 0.2]} color="#ff9a4a" intensity={light} distance={6} decay={1.6} />
    </group>
  );
}

/** Small glowing bulbs (string lights, fireflies) that twinkle. */
export function Glows({ points, color = '#ffd58a', size = 0.025, twinkle = true }: { points: [number, number, number][]; color?: string; size?: number; twinkle?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(state => {
    if (!twinkle) return;
    const t = state.clock.elapsedTime;
    ref.current?.children.forEach((c, i) => c.scale.setScalar(0.8 + Math.sin(t * 2 + i * 1.7) * 0.25));
  });
  return (
    <group ref={ref}>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Drifting particles: snow, petals, pollen. */
export function Drift({ count, color, size, speed, area = 12, sway = 0.3, opacity = 0.9 }: { count: number; color: string; size: number; speed: number; area?: number; sway?: number; opacity?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const flakes = useMemo(() => {
    const r = rng(count * 13 + Math.round(size * 1000));
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * area, y: r() * 8, z: -r() * area * 0.8 + 2, v: speed * (0.6 + r() * 0.8), p: r() * 6, s: size * (0.6 + r() * 0.8) }));
  }, [count, size, speed, area]);
  useFrame(state => {
    const t = state.clock.elapsedTime;
    flakes.forEach((f, i) => {
      dummy.position.set(f.x + Math.sin(t * 0.6 + f.p) * sway, 7.4 - ((f.y + t * f.v) % 8), f.z);
      dummy.rotation.set(t + f.p, t * 0.7, 0);
      dummy.scale.setScalar(f.s);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * A cartoon prop from public/models/scenes (CC0, see CREDITS.md there),
 * scaled to `height` and standing on the ground (or at `y`).
 */
export function Prop({ name, height, position, rotation = 0, y }: {
  name: string; height: number; position: [number, number]; rotation?: number; y?: number;
}) {
  const { scene } = useGLTF(`/models/scenes/${name}.glb`);
  const { object, scale, lift } = useMemo(() => {
    const object = SkeletonUtils.clone(scene);
    object.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    const box = new THREE.Box3().setFromObject(object, true);
    const scale = height / Math.max(box.max.y - box.min.y, 1e-6);
    return { object, scale, lift: -box.min.y * scale };
  }, [scene, height]);
  return (
    <group position={[position[0], (y ?? GROUND) + lift, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}
