import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export function HamsterModel({ isHovered }: { isHovered: boolean }) {
  const group = useRef<Group>(null);
  const cheekLRef = useRef<Group>(null);
  const cheekRRef = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    // Bouncy breathing
    group.current.scale.y = 1 + Math.sin(t * 3) * 0.03;
    group.current.scale.x = 1 + Math.sin(t * 3 + Math.PI) * 0.015;

    // Wobble
    group.current.position.y = Math.sin(t * 2) * 0.04;
    group.current.rotation.z = Math.sin(t * 1.5) * 0.05;
    group.current.rotation.y = Math.sin(t * 0.7) * 0.2;

    // Cheek puff animation
    if (cheekLRef.current && cheekRRef.current) {
      const puff = 1 + Math.sin(t * 2.5) * 0.08;
      cheekLRef.current.scale.set(puff, puff, puff);
      cheekRRef.current.scale.set(puff, puff, puff);
    }

    // Excited bouncing when hovered
    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 8)) * 0.12;
      group.current.rotation.z = Math.sin(t * 6) * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Body - very round and chubby */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.95} />
      </mesh>

      {/* Belly stripe */}
      <mesh position={[0, -0.1, 0.2]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial color="#FFF8F0" roughness={1} />
      </mesh>

      {/* Head (merged with body for hamster roundness) */}
      <mesh position={[0, 0.35, 0.15]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.95} />
      </mesh>

      {/* Left Cheek - puffy! */}
      <group ref={cheekLRef} position={[-0.22, 0.28, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial color="#FFE0E0" roughness={0.9} />
        </mesh>
      </group>

      {/* Right Cheek - puffy! */}
      <group ref={cheekRRef} position={[0.22, 0.28, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial color="#FFE0E0" roughness={0.9} />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, 0.32, 0.48]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#FFB0B0" roughness={0.3} />
      </mesh>

      {/* Eyes - tiny and round */}
      <mesh position={[-0.1, 0.42, 0.4]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.1} />
      </mesh>
      <mesh position={[0.1, 0.42, 0.4]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.1} />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.09, 0.44, 0.44]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.11, 0.44, 0.44]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
      </mesh>

      {/* Tiny round ears */}
      <mesh position={[-0.18, 0.62, 0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FFD0D0" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.62, 0.1]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FFD0D0" roughness={0.9} />
      </mesh>

      {/* Inner ears */}
      <mesh position={[-0.18, 0.63, 0.14]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#FFB0B0" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.63, 0.14]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#FFB0B0" roughness={0.9} />
      </mesh>

      {/* Tiny front paws */}
      <mesh position={[-0.2, -0.3, 0.25]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#F5E8E0" roughness={0.9} />
      </mesh>
      <mesh position={[0.2, -0.3, 0.25]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#F5E8E0" roughness={0.9} />
      </mesh>

      {/* Tiny back paws */}
      <mesh position={[-0.22, -0.4, -0.05]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#F5E8E0" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, -0.4, -0.05]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#F5E8E0" roughness={0.9} />
      </mesh>

      {/* Tiny tail nub */}
      <mesh position={[0, 0, -0.48]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#F5E8E0" roughness={0.9} />
      </mesh>

      {/* Sunflower seed (when hovered - it's eating!) */}
      {isHovered && (
        <group position={[0, 0.22, 0.5]}>
          <mesh rotation={[0.3, 0, 0.2]}>
            <capsuleGeometry args={[0.03, 0.06, 8, 8]} />
            <meshStandardMaterial color="#4a3520" roughness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}
