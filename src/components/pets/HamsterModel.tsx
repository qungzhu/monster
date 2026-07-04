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

export function HamsterModel({ isHovered }: { isHovered: boolean }) {
  const group = useRef<Group>(null);
  const cheekLRef = useRef<Group>(null);
  const cheekRRef = useRef<Group>(null);
  const pawLRef = useRef<Group>(null);
  const pawRRef = useRef<Group>(null);
  const gradientMap = useToonGradient(4);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 3) * 0.03;
    group.current.scale.x = 1 + Math.sin(t * 3 + Math.PI) * 0.015;
    group.current.position.y = Math.sin(t * 2) * 0.04;
    group.current.rotation.z = Math.sin(t * 1.5) * 0.04;
    group.current.rotation.y = Math.sin(t * 0.7) * 0.15;

    if (cheekLRef.current && cheekRRef.current) {
      const puff = 1 + Math.sin(t * 2.5) * 0.1;
      cheekLRef.current.scale.set(puff, puff, puff);
      cheekRRef.current.scale.set(puff, puff, puff);
    }

    if (pawLRef.current && pawRRef.current) {
      pawLRef.current.rotation.x = Math.sin(t * 3) * 0.15;
      pawRRef.current.rotation.x = Math.sin(t * 3 + 0.5) * 0.15;
    }

    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 8)) * 0.14;
      group.current.rotation.z = Math.sin(t * 6) * 0.08;
    }
  });

  const mainColor = '#FAFAFA';
  const creamColor = '#FFF5EA';
  const pinkColor = '#FFD8D8';
  const darkPink = '#FFB8B8';
  const earColor = '#FFCCCC';
  const pawColor = '#FFF0E8';

  return (
    <group ref={group}>
      {/* Body - very round */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.5, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Belly */}
      <mesh position={[0, -0.08, 0.22]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshToonMaterial color={creamColor} gradientMap={gradientMap} />
      </mesh>

      {/* Back stripe */}
      <mesh position={[0, 0.2, -0.15]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshToonMaterial color="#F0E8E0" gradientMap={gradientMap} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.35, 0.12]} castShadow>
        <sphereGeometry args={[0.36, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Left Cheek - puffy! */}
      <group ref={cheekLRef} position={[-0.24, 0.26, 0.28]}>
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.04, -0.02, 0.08]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#ffbbbb" transparent opacity={0.3} toneMapped={false} />
        </mesh>
      </group>

      {/* Right Cheek */}
      <group ref={cheekRRef} position={[0.24, 0.26, 0.28]}>
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0.04, -0.02, 0.08]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#ffbbbb" transparent opacity={0.3} toneMapped={false} />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, 0.32, 0.46]}>
        <sphereGeometry args={[0.04, 20, 20]} />
        <meshStandardMaterial color={darkPink} roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Mouth */}
      <mesh position={[-0.015, 0.28, 0.44]} rotation={[0.1, 0.08, 0]}>
        <torusGeometry args={[0.02, 0.004, 8, 10, Math.PI]} />
        <meshToonMaterial color="#E0A0A0" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.015, 0.28, 0.44]} rotation={[0.1, -0.08, 0]}>
        <torusGeometry args={[0.02, 0.004, 8, 10, Math.PI]} />
        <meshToonMaterial color="#E0A0A0" gradientMap={gradientMap} />
      </mesh>

      {/* Eyes - tiny, round, sparkly */}
      <group position={[-0.1, 0.42, 0.38]}>
        <mesh>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshStandardMaterial color="#111" roughness={0.05} />
        </mesh>
        <mesh position={[-0.015, 0.02, 0.04]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[0.02, -0.01, 0.04]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>
      <group position={[0.1, 0.42, 0.38]}>
        <mesh>
          <sphereGeometry args={[0.06, 20, 20]} />
          <meshStandardMaterial color="#111" roughness={0.05} />
        </mesh>
        <mesh position={[0.015, 0.02, 0.04]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[-0.02, -0.01, 0.04]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>

      {/* Ears */}
      <mesh position={[-0.2, 0.62, 0.08]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshToonMaterial color={earColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.2, 0.62, 0.08]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshToonMaterial color={earColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.2, 0.63, 0.12]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshToonMaterial color={darkPink} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.2, 0.63, 0.12]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshToonMaterial color={darkPink} gradientMap={gradientMap} />
      </mesh>

      {/* Front paws - animated */}
      <group ref={pawLRef} position={[-0.2, -0.25, 0.28]}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshToonMaterial color={pawColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.02, 0.05]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
        </mesh>
      </group>
      <group ref={pawRRef} position={[0.2, -0.25, 0.28]}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshToonMaterial color={pawColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, -0.02, 0.05]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Back paws */}
      <mesh position={[-0.22, -0.38, -0.02]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshToonMaterial color={pawColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.22, -0.38, -0.02]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshToonMaterial color={pawColor} gradientMap={gradientMap} />
      </mesh>

      {/* Tail nub */}
      <mesh position={[0, 0.02, -0.48]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshToonMaterial color={pawColor} gradientMap={gradientMap} />
      </mesh>

      {/* Sunflower seed (when hovered) */}
      {isHovered && (
        <group position={[0, 0.2, 0.48]}>
          <mesh rotation={[0.3, 0, 0.2]}>
            <capsuleGeometry args={[0.03, 0.07, 8, 12]} />
            <meshToonMaterial color="#4a3520" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.01, 0.01]} rotation={[0.3, 0, 0.2]}>
            <capsuleGeometry args={[0.02, 0.04, 8, 8]} />
            <meshToonMaterial color="#6B5030" gradientMap={gradientMap} />
          </mesh>
        </group>
      )}

      {/* Blush (when hovered) */}
      {isHovered && (
        <>
          <mesh position={[-0.3, 0.28, 0.32]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#ff9999" transparent opacity={0.45} toneMapped={false} />
          </mesh>
          <mesh position={[0.3, 0.28, 0.32]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#ff9999" transparent opacity={0.45} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
