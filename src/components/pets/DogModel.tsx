import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export function DogModel({ isHovered }: { isHovered: boolean }) {
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    // Breathing
    group.current.scale.y = 1 + Math.sin(t * 2) * 0.02;

    // Gentle bob
    group.current.position.y = Math.sin(t * 1.5) * 0.05;

    // Look around slowly
    group.current.rotation.y = Math.sin(t * 0.5) * 0.15;

    // Tail wag - faster when hovered
    if (tailRef.current) {
      const wagSpeed = isHovered ? 12 : 4;
      const wagAmount = isHovered ? 0.6 : 0.3;
      tailRef.current.rotation.z = Math.sin(t * wagSpeed) * wagAmount;
    }

    // Ear flop
    if (earLRef.current) {
      earLRef.current.rotation.z = -0.3 + Math.sin(t * 1.8) * 0.08;
    }
    if (earRRef.current) {
      earRRef.current.rotation.z = 0.3 - Math.sin(t * 1.8) * 0.08;
    }

    // Excited bounce when hovered
    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 6)) * 0.15;
    }
  });

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.55, 0.25]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.45, 0.58]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#F0C060" roughness={0.9} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.48, 0.74]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#333" roughness={0.3} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.14, 0.62, 0.52]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#2C1810" roughness={0.2} />
      </mesh>
      <mesh position={[0.14, 0.62, 0.52]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#2C1810" roughness={0.2} />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.12, 0.64, 0.57]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.16, 0.64, 0.57]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>

      {/* Left Ear */}
      <group ref={earLRef} position={[-0.3, 0.85, 0.2]}>
        <mesh>
          <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
          <meshStandardMaterial color="#C88828" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Ear */}
      <group ref={earRRef} position={[0.3, 0.85, 0.2]}>
        <mesh>
          <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
          <meshStandardMaterial color="#C88828" roughness={0.9} />
        </mesh>
      </group>

      {/* Front Legs */}
      <mesh position={[-0.22, -0.45, 0.15]}>
        <capsuleGeometry args={[0.09, 0.25, 8, 16]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>
      <mesh position={[0.22, -0.45, 0.15]}>
        <capsuleGeometry args={[0.09, 0.25, 8, 16]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>

      {/* Back Legs */}
      <mesh position={[-0.22, -0.45, -0.15]}>
        <capsuleGeometry args={[0.09, 0.25, 8, 16]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>
      <mesh position={[0.22, -0.45, -0.15]}>
        <capsuleGeometry args={[0.09, 0.25, 8, 16]} />
        <meshStandardMaterial color="#E8A838" roughness={0.8} />
      </mesh>

      {/* Tail */}
      <group ref={tailRef} position={[0, 0.1, -0.5]}>
        <mesh rotation={[0.5, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.3, 8, 16]} />
          <meshStandardMaterial color="#D49830" roughness={0.9} />
        </mesh>
      </group>

      {/* Tongue (visible when hovered) */}
      {isHovered && (
        <mesh position={[0, 0.38, 0.7]} rotation={[0.3, 0, 0]}>
          <capsuleGeometry args={[0.04, 0.08, 8, 8]} />
          <meshStandardMaterial color="#ff6b8a" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}
