import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export function CatModel({ isHovered }: { isHovered: boolean }) {
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    // Elegant breathing
    group.current.scale.y = 1 + Math.sin(t * 1.5) * 0.015;

    // Subtle sway
    group.current.position.y = Math.sin(t * 1.2) * 0.03;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.1;

    // Tail sway - elegant S-curve
    if (tailRef.current) {
      tailRef.current.rotation.x = -0.8 + Math.sin(t * 1.5) * 0.15;
      tailRef.current.rotation.z = Math.sin(t * 2) * 0.3;
    }

    // Ear twitch
    if (earLRef.current) {
      earLRef.current.rotation.z = -0.2 + (Math.sin(t * 3) > 0.95 ? 0.15 : 0);
    }
    if (earRRef.current) {
      earRRef.current.rotation.z = 0.2 - (Math.cos(t * 2.7) > 0.95 ? 0.15 : 0);
    }

    // Slow blink when hovered (pretending not to care)
    if (isHovered) {
      group.current.rotation.y = Math.sin(t * 0.3) * 0.05; // less movement = aloof
    }
  });

  return (
    <group ref={group}>
      {/* Body - more elongated than dog */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>

      {/* Chest fluff */}
      <mesh position={[0, 0.15, 0.2]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#FAFAFA" roughness={1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.5, 0.2]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.44, 0.52]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#FFB0B0" roughness={0.3} />
      </mesh>

      {/* Eyes - big and blue (ragdoll cat) */}
      <mesh position={[-0.13, 0.55, 0.45]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#4466CC" roughness={0.2} />
      </mesh>
      <mesh position={[0.13, 0.55, 0.45]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#4466CC" roughness={0.2} />
      </mesh>

      {/* Pupils */}
      <mesh position={[-0.13, 0.55, 0.52]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#111" roughness={0.1} />
      </mesh>
      <mesh position={[0.13, 0.55, 0.52]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#111" roughness={0.1} />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.11, 0.57, 0.53]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.15, 0.57, 0.53]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>

      {/* Left Ear - pointed triangle */}
      <group ref={earLRef} position={[-0.2, 0.82, 0.18]}>
        <mesh>
          <coneGeometry args={[0.1, 0.22, 4]} />
          <meshStandardMaterial color="#E8E0E0" roughness={0.9} />
        </mesh>
        {/* Inner ear */}
        <mesh position={[0, -0.02, 0.02]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color="#FFD0D0" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Ear */}
      <group ref={earRRef} position={[0.2, 0.82, 0.18]}>
        <mesh>
          <coneGeometry args={[0.1, 0.22, 4]} />
          <meshStandardMaterial color="#E8E0E0" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.02, 0.02]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color="#FFD0D0" roughness={0.9} />
        </mesh>
      </group>

      {/* Whiskers (thin lines) */}
      <mesh position={[-0.2, 0.44, 0.48]} rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.005, 0.15, 4, 4]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[-0.2, 0.42, 0.48]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.005, 0.15, 4, 4]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[0.2, 0.44, 0.48]} rotation={[0, 0, -0.1]}>
        <capsuleGeometry args={[0.005, 0.15, 4, 4]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[0.2, 0.42, 0.48]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.005, 0.15, 4, 4]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>

      {/* Front Paws */}
      <mesh position={[-0.15, -0.38, 0.15]}>
        <capsuleGeometry args={[0.07, 0.2, 8, 16]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>
      <mesh position={[0.15, -0.38, 0.15]}>
        <capsuleGeometry args={[0.07, 0.2, 8, 16]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>

      {/* Back Paws */}
      <mesh position={[-0.18, -0.38, -0.12]}>
        <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, -0.38, -0.12]}>
        <capsuleGeometry args={[0.08, 0.2, 8, 16]} />
        <meshStandardMaterial color="#F5F0F0" roughness={0.9} />
      </mesh>

      {/* Tail - long and fluffy */}
      <group ref={tailRef} position={[0, 0.1, -0.45]}>
        <mesh rotation={[-0.8, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.45, 8, 16]} />
          <meshStandardMaterial color="#E8E0E0" roughness={1} />
        </mesh>
        {/* Tail tip */}
        <mesh position={[0, 0.05, -0.4]} rotation={[-0.5, 0, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#FAFAFA" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
