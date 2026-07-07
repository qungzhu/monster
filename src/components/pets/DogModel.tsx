import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import type { DogParams } from '../../data/breeds';

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

const goldenDefaults: DogParams = {
  bodyColor: '#E8A838',
  accentColor: '#C88828',
  bellyColor: '#FDE8C0',
  eyeColor: '#3D2814',
  earStyle: 'floppy',
  tailStyle: 'wag',
  legScale: 1,
};

/**
 * Parametric dog: one geometry set, many breeds. Colors, ear style
 * (floppy/pointy), tail style (wag/curl) and leg length are all
 * driven by breed params.
 */
export function DogModel({ isHovered, params }: { isHovered: boolean; params?: DogParams }) {
  const p = params ?? goldenDefaults;
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);
  const tongueRef = useRef<Group>(null);
  const gradientMap = useToonGradient(4);

  // Short-legged breeds sit lower so feet stay on the ground
  const drop = (1 - p.legScale) * 0.28;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    group.current.scale.x = 1 + Math.sin(t * 2 + Math.PI) * 0.01;
    group.current.position.y = Math.sin(t * 1.5) * 0.04 - drop;
    group.current.rotation.y = Math.sin(t * 0.5) * 0.12;

    if (tailRef.current) {
      const wagSpeed = isHovered ? 14 : 5;
      const wagAmount = (isHovered ? 0.7 : 0.35) * (p.tailStyle === 'curl' ? 0.45 : 1);
      tailRef.current.rotation.z = Math.sin(t * wagSpeed) * wagAmount;
      if (p.tailStyle === 'wag') {
        tailRef.current.rotation.x = -0.6 + Math.sin(t * 3) * 0.1;
      }
    }

    if (p.earStyle === 'floppy') {
      if (earLRef.current) earLRef.current.rotation.z = -0.3 + Math.sin(t * 1.8) * 0.1;
      if (earRRef.current) earRRef.current.rotation.z = 0.3 - Math.sin(t * 1.8) * 0.1;
    } else {
      // Pointy ears twitch instead of flopping
      if (earLRef.current) earLRef.current.rotation.z = -0.08 + (Math.sin(t * 2.6) > 0.94 ? 0.12 : 0);
      if (earRRef.current) earRRef.current.rotation.z = 0.08 - (Math.cos(t * 2.2) > 0.94 ? 0.12 : 0);
    }

    if (tongueRef.current) {
      tongueRef.current.scale.y = 1 + Math.sin(t * 4) * 0.15;
    }

    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 6)) * 0.15 - drop;
      group.current.rotation.z = Math.sin(t * 4) * 0.05;
    }
  });

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.52, 48, 48]} />
        <meshToonMaterial color={p.bodyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Belly */}
      <mesh position={[0, -0.12, 0.22]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshToonMaterial color={p.bodyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Cheeks */}
      <mesh position={[-0.22, 0.4, 0.42]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.22, 0.4, 0.42]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.4, 0.55]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.44, 0.72]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshStandardMaterial color="#222" roughness={0.1} metalness={0.3} />
      </mesh>

      {/* Mouth line */}
      <mesh position={[0, 0.37, 0.68]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.04, 0.008, 8, 16, Math.PI]} />
        <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
      </mesh>

      {/* Eyes */}
      {[-0.14, 0.14].map((x, side) => (
        <group key={side} position={[x, 0.58, 0.5]}>
          <mesh>
            <sphereGeometry args={[0.09, 24, 24]} />
            <meshStandardMaterial color="#fff" roughness={0.1} />
          </mesh>
          <mesh position={[side === 0 ? 0.01 : -0.01, -0.01, 0.04]}>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial color={p.eyeColor} roughness={0.1} />
          </mesh>
          <mesh position={[side === 0 ? 0.02 : -0.02, -0.015, 0.07]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#1a0e06" roughness={0.05} />
          </mesh>
          <mesh position={[-0.02 + side * 0.04, 0.03, 0.08]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color="#fff" toneMapped={false} />
          </mesh>
          <mesh position={[0.03 - side * 0.06, -0.02, 0.075]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#fff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Eyebrows */}
      <mesh position={[-0.14, 0.7, 0.48]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
        <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.14, 0.7, 0.48]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
        <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
      </mesh>

      {/* Ears — floppy capsules or upright pointy cones */}
      {p.earStyle === 'floppy' ? (
        <>
          <group ref={earLRef} position={[-0.3, 0.82, 0.15]}>
            <mesh rotation={[0.2, 0, -0.3]}>
              <capsuleGeometry args={[0.1, 0.22, 12, 20]} />
              <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0.02, -0.05, 0.03]} rotation={[0.2, 0, -0.3]}>
              <capsuleGeometry args={[0.06, 0.14, 8, 12]} />
              <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.3, 0.82, 0.15]}>
            <mesh rotation={[0.2, 0, 0.3]}>
              <capsuleGeometry args={[0.1, 0.22, 12, 20]} />
              <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[-0.02, -0.05, 0.03]} rotation={[0.2, 0, 0.3]}>
              <capsuleGeometry args={[0.06, 0.14, 8, 12]} />
              <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
            </mesh>
          </group>
        </>
      ) : (
        <>
          <group ref={earLRef} position={[-0.22, 0.88, 0.12]}>
            <mesh rotation={[0, 0, -0.12]}>
              <coneGeometry args={[0.12, 0.28, 4]} />
              <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, -0.02, 0.03]} rotation={[0, 0, -0.12]}>
              <coneGeometry args={[0.075, 0.18, 4]} />
              <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.22, 0.88, 0.12]}>
            <mesh rotation={[0, 0, 0.12]}>
              <coneGeometry args={[0.12, 0.28, 4]} />
              <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, -0.02, 0.03]} rotation={[0, 0, 0.12]}>
              <coneGeometry args={[0.075, 0.18, 4]} />
              <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
            </mesh>
          </group>
        </>
      )}

      {/* Legs — length scaled per breed (corgi mode!) */}
      {[[-0.2, 0.18], [0.2, 0.18], [-0.2, -0.12], [0.2, -0.12]].map(([x, z], i) => (
        <group key={i} position={[x, -0.48 + (1 - p.legScale) * 0.11, z]}>
          <mesh castShadow scale={[1, p.legScale, 1]}>
            <capsuleGeometry args={[0.1, 0.22, 12, 16]} />
            <meshToonMaterial color={p.bodyColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.16 * p.legScale, 0.03]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}

      {/* Tail — straight wag or curled over the back */}
      {p.tailStyle === 'wag' ? (
        <group ref={tailRef} position={[0, 0.15, -0.48]}>
          <mesh rotation={[-0.6, 0, 0]}>
            <capsuleGeometry args={[0.065, 0.35, 12, 16]} />
            <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.22, -0.15]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      ) : (
        <group ref={tailRef} position={[0, 0.28, -0.42]}>
          <mesh rotation={[0.4, 0.5, 0]}>
            <torusGeometry args={[0.14, 0.06, 12, 20, Math.PI * 1.4]} />
            <meshToonMaterial color={p.accentColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0.05, 0.12, 0.02]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      )}

      {/* Tongue */}
      {isHovered && (
        <group ref={tongueRef} position={[0, 0.33, 0.7]} rotation={[0.4, 0, 0]}>
          <mesh>
            <capsuleGeometry args={[0.04, 0.1, 8, 12]} />
            <meshToonMaterial color="#ff6b8a" gradientMap={gradientMap} />
          </mesh>
        </group>
      )}

      {/* Blush */}
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
