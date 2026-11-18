import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PetParticlesProps {
  color: string;
  count?: number;
}

export function PetParticles({ color, count = 20 }: PetParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const random = seededRandom(count);
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 3,
      y: random() * 2.5 - 0.5,
      z: (random() - 0.5) * 3,
      speed: 0.2 + random() * 0.4,
      offset: random() * Math.PI * 2,
      scale: 0.02 + random() * 0.03,
      rotSpeed: (random() - 0.5) * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    particles.forEach((p, i) => {
      const y = ((p.y + t * p.speed) % 3) - 0.5;
      const x = p.x + Math.sin(t * 0.5 + p.offset) * 0.3;
      const z = p.z + Math.cos(t * 0.3 + p.offset) * 0.2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, t * p.rotSpeed);
      const pulse = p.scale * (0.8 + Math.sin(t * 2 + p.offset) * 0.3);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/** Small seeded PRNG (mulberry32) so the layout is pure and stable. */
function seededRandom(seed: number) {
  let a = seed * 0x9e3779b1 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
