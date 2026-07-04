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
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 3,
      y: Math.random() * 2.5 - 0.5,
      z: (Math.random() - 0.5) * 3,
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.03,
      rotSpeed: (Math.random() - 0.5) * 2,
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
