import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Frozen-style 3D winter set dressing rendered behind the pet:
 * falling snow, faceted low-poly mountains, snow-dusted pines and
 * an icy ground plane. Deterministic layout (no Math.random at
 * module scope) so re-renders are stable.
 */

function Snowfall({ count = 260 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (((i * 73) % 200) / 200 - 0.5) * 13,
        y: ((i * 37) % 100) / 100 * 9,
        z: (((i * 51) % 200) / 200 - 0.5) * 10 - 2,
        speed: 0.25 + ((i * 17) % 50) / 90,
        swayAmp: 0.15 + ((i * 29) % 30) / 90,
        swayFreq: 0.4 + ((i * 13) % 40) / 60,
        size: 0.012 + ((i * 19) % 22) / 900,
      })),
    [count]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    flakes.forEach((f, i) => {
      const y = 8.5 - ((f.y + t * f.speed) % 9);
      const x = f.x + Math.sin(t * f.swayFreq + i) * f.swayAmp;
      dummy.position.set(x, y - 0.6, f.z);
      dummy.scale.setScalar(f.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

function Mountain({ position, scale, hue }: { position: [number, number, number]; scale: number; hue: string }) {
  return (
    <group position={position}>
      {/* Faceted rock body */}
      <mesh scale={[scale, scale * 1.25, scale]}>
        <coneGeometry args={[1.5, 2.6, 6]} />
        <meshStandardMaterial color={hue} flatShading roughness={0.95} />
      </mesh>
      {/* Snow cap */}
      <mesh position={[0, scale * 1.05, 0]} scale={[scale * 0.62, scale * 0.66, scale * 0.62]}>
        <coneGeometry args={[0.95, 1.35, 6]} />
        <meshStandardMaterial color="#eef4fd" flatShading roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pine({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={1} flatShading />
      </mesh>
      {[0.42, 0.72, 0.98].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]}>
            <coneGeometry args={[0.42 - i * 0.11, 0.42, 7]} />
            <meshStandardMaterial color="#1e4d45" roughness={0.9} flatShading />
          </mesh>
          {/* Snow dusting on each tier */}
          <mesh position={[0, y + 0.09, 0]}>
            <coneGeometry args={[0.3 - i * 0.08, 0.16, 7]} />
            <meshStandardMaterial color="#e8f1fb" roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SnowGround() {
  return (
    <group>
      {/* Main snow field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.67, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#dcE9f8" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Icy sheen ring around the pet's spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]}>
        <circleGeometry args={[1.6, 40]} />
        <meshStandardMaterial color="#f2f8ff" roughness={0.35} metalness={0.25} transparent opacity={0.85} />
      </mesh>
      {/* Snow drifts */}
      {[
        [-2.6, -1.4, 0.5], [2.9, -2.2, 0.65], [-3.8, -3.6, 0.8],
        [4.1, -4.2, 0.9], [1.8, -1.1, 0.35], [-1.5, -2.8, 0.5],
      ].map(([x, z, s], i) => (
        <mesh key={i} position={[x, -0.72 + s * 0.18, z]} scale={[s * 1.6, s * 0.5, s]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#e6effa" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function WinterScene() {
  return (
    <group>
      <SnowGround />
      <Snowfall />

      {/* Mountain range — far backdrop, low enough to leave sky for the aurora */}
      <Mountain position={[-5.5, -0.7, -10]} scale={1.3} hue="#3d5a8a" />
      <Mountain position={[-2.4, -0.7, -12]} scale={1.7} hue="#33507e" />
      <Mountain position={[2.6, -0.7, -11.5]} scale={1.5} hue="#3a5685" />
      <Mountain position={[6.2, -0.7, -9.5]} scale={1.15} hue="#40608f" />
      <Mountain position={[0.2, -0.7, -14]} scale={2.1} hue="#2c4874" />

      {/* Snow-dusted pines framing the stage */}
      <Pine position={[-2.6, -0.7, -3.2]} scale={0.85} />
      <Pine position={[-3.9, -0.7, -5.2]} scale={1.15} />
      <Pine position={[2.9, -0.7, -3.6]} scale={0.95} />
      <Pine position={[4.2, -0.7, -5.8]} scale={1.25} />
      <Pine position={[-1.9, -0.7, -6.5]} scale={1.0} />
      <Pine position={[1.8, -0.7, -7.2]} scale={0.9} />

      {/* Icy blue moon-light from behind, cool fill */}
      <directionalLight position={[-4, 5, -6]} intensity={0.5} color="#9fc4ff" />
      <fog attach="fog" args={['#22375c', 8, 18]} />
    </group>
  );
}
