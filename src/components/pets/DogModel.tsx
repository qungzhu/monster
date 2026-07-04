import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';

function useToonGradient(steps: number = 4) {
  return useMemo(() => {
    const colors = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) {
      colors[i] = Math.floor((i / (steps - 1)) * 255);
    }
    const tex = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [steps]);
}

export function DogModel({ isHovered }: { isHovered: boolean }) {
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);
  const tongueRef = useRef<Group>(null);
  const gradientMap = useToonGradient(4);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    group.current.scale.x = 1 + Math.sin(t * 2 + Math.PI) * 0.01;
    group.current.position.y = Math.sin(t * 1.5) * 0.04;
    group.current.rotation.y = Math.sin(t * 0.5) * 0.12;

    if (tailRef.current) {
      const wagSpeed = isHovered ? 14 : 5;
      const wagAmount = isHovered ? 0.7 : 0.35;
      tailRef.current.rotation.z = Math.sin(t * wagSpeed) * wagAmount;
      tailRef.current.rotation.x = -0.6 + Math.sin(t * 3) * 0.1;
    }

    if (earLRef.current) earLRef.current.rotation.z = -0.3 + Math.sin(t * 1.8) * 0.1;
    if (earRRef.current) earRRef.current.rotation.z = 0.3 - Math.sin(t * 1.8) * 0.1;

    if (tongueRef.current) {
      tongueRef.current.scale.y = 1 + Math.sin(t * 4) * 0.15;
    }

    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 6)) * 0.15;
      group.current.rotation.z = Math.sin(t * 4) * 0.05;
    }
  });

  const mainColor = '#E8A838';
  const darkColor = '#C88828';
  const lightColor = '#F5C86A';
  const bellyColor = '#FDE8C0';

  return (
    <group ref={group}>
      {/* Body - rounder, more stylized */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.52, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Belly */}
      <mesh position={[0, -0.12, 0.22]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshToonMaterial color={bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Head - bigger for cute proportions */}
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Cheeks */}
      <mesh position={[-0.22, 0.4, 0.42]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.22, 0.4, 0.42]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
      </mesh>

      {/* Snout - softer */}
      <mesh position={[0, 0.4, 0.55]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
      </mesh>

      {/* Nose - shiny */}
      <mesh position={[0, 0.44, 0.72]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color="#222" roughness={0.1} metalness={0.3} />
      </mesh>

      {/* Mouth line */}
      <mesh position={[0, 0.37, 0.68]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.04, 0.008, 8, 16, Math.PI]} />
        <meshToonMaterial color="#8B6914" gradientMap={gradientMap} />
      </mesh>

      {/* Eyes - bigger, more expressive */}
      <group position={[-0.14, 0.58, 0.5]}>
        <mesh>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial color="#fff" roughness={0.1} />
        </mesh>
        <mesh position={[0.01, -0.01, 0.04]}>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshStandardMaterial color="#3D2814" roughness={0.1} />
        </mesh>
        <mesh position={[0.02, -0.015, 0.07]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color="#1a0e06" roughness={0.05} />
        </mesh>
        {/* Highlight */}
        <mesh position={[-0.02, 0.03, 0.08]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[0.03, -0.02, 0.075]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>

      <group position={[0.14, 0.58, 0.5]}>
        <mesh>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial color="#fff" roughness={0.1} />
        </mesh>
        <mesh position={[-0.01, -0.01, 0.04]}>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshStandardMaterial color="#3D2814" roughness={0.1} />
        </mesh>
        <mesh position={[-0.02, -0.015, 0.07]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color="#1a0e06" roughness={0.05} />
        </mesh>
        <mesh position={[0.02, 0.03, 0.08]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[-0.03, -0.02, 0.075]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>

      {/* Eyebrows */}
      <mesh position={[-0.14, 0.7, 0.48]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
        <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.14, 0.7, 0.48]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
        <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
      </mesh>

      {/* Ears - floppy, softer */}
      <group ref={earLRef} position={[-0.3, 0.82, 0.15]}>
        <mesh rotation={[0.2, 0, -0.3]}>
          <capsuleGeometry args={[0.1, 0.22, 12, 20]} />
          <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0.02, -0.05, 0.03]} rotation={[0.2, 0, -0.3]}>
          <capsuleGeometry args={[0.06, 0.14, 8, 12]} />
          <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
        </mesh>
      </group>
      <group ref={earRRef} position={[0.3, 0.82, 0.15]}>
        <mesh rotation={[0.2, 0, 0.3]}>
          <capsuleGeometry args={[0.1, 0.22, 12, 20]} />
          <meshToonMaterial color={darkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.02, -0.05, 0.03]} rotation={[0.2, 0, 0.3]}>
          <capsuleGeometry args={[0.06, 0.14, 8, 12]} />
          <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Legs - chunkier, cuter */}
      {[[-0.2, -0.48, 0.18], [0.2, -0.48, 0.18], [-0.2, -0.48, -0.12], [0.2, -0.48, -0.12]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.1, 0.22, 12, 16]} />
            <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.16, 0.03]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshToonMaterial color={bellyColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}

      {/* Tail */}
      <group ref={tailRef} position={[0, 0.15, -0.48]}>
        <mesh rotation={[-0.6, 0, 0]}>
          <capsuleGeometry args={[0.065, 0.35, 12, 16]} />
          <meshToonMaterial color={lightColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.22, -0.15]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshToonMaterial color={bellyColor} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Tongue */}
      {isHovered && (
        <group ref={tongueRef} position={[0, 0.33, 0.7]} rotation={[0.4, 0, 0]}>
          <mesh>
            <capsuleGeometry args={[0.04, 0.1, 8, 12]} />
            <meshToonMaterial color="#ff6b8a" gradientMap={gradientMap} />
          </mesh>
        </group>
      )}

      {/* Blush spots (when hovered) */}
      {isHovered && (
        <>
          <mesh position={[-0.28, 0.42, 0.44]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#ff9999" transparent opacity={0.4} toneMapped={false} />
          </mesh>
          <mesh position={[0.28, 0.42, 0.44]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color="#ff9999" transparent opacity={0.4} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
