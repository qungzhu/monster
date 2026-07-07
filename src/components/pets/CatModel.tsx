import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import type { CatParams } from '../../data/breeds';

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

const ragdollDefaults: CatParams = {
  bodyColor: '#F0EAE8',
  pointColor: '#C8B8B0',
  bellyColor: '#FAFAFA',
  eyeColor: '#5588DD',
  earStyle: 'point',
};

/**
 * Parametric cat: colors, eye color and ear style (pointed/folded)
 * come from breed params so one model renders many breeds.
 */
export function CatModel({ isHovered, params }: { isHovered: boolean; params?: CatParams }) {
  const p = params ?? ragdollDefaults;
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const tailTipRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);
  const gradientMap = useToonGradient(4);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 1.5) * 0.015;
    group.current.position.y = Math.sin(t * 1.2) * 0.03;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.1;

    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 1.8) * 0.35;
      tailRef.current.rotation.x = -0.7 + Math.sin(t * 1.2) * 0.15;
    }
    if (tailTipRef.current) {
      tailTipRef.current.rotation.z = Math.sin(t * 2.5 + 1) * 0.4;
    }

    if (earLRef.current) earLRef.current.rotation.z = -0.15 + (Math.sin(t * 3) > 0.93 ? 0.18 : 0);
    if (earRRef.current) earRRef.current.rotation.z = 0.15 - (Math.cos(t * 2.7) > 0.93 ? 0.18 : 0);

    if (isHovered) {
      group.current.rotation.y = Math.sin(t * 0.3) * 0.05;
      group.current.scale.y = 1 + Math.sin(t * 1) * 0.01;
    }
  });

  const mainColor = p.bodyColor;
  const pointColor = p.pointColor;
  const darkPointColor = p.pointColor;
  const pinkColor = '#FFD0D0';
  const noseColor = p.noseColor ?? '#FFB0B0';

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <sphereGeometry args={[0.48, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Chest fluff - layered */}
      <mesh position={[0, 0.1, 0.2]}>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.02, 0.25]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Head - larger for cuteness */}
      <mesh position={[0, 0.48, 0.18]} castShadow>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshToonMaterial color={mainColor} gradientMap={gradientMap} />
      </mesh>

      {/* Face markings - ragdoll pattern */}
      <mesh position={[0, 0.52, 0.35]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
      </mesh>

      {/* Cheeks */}
      <mesh position={[-0.2, 0.4, 0.38]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.2, 0.4, 0.38]}>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.43, 0.53]}>
        <sphereGeometry args={[0.035, 20, 20]} />
        <meshStandardMaterial color={noseColor} roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Mouth */}
      <mesh position={[-0.02, 0.39, 0.5]} rotation={[0.1, 0.1, 0]}>
        <torusGeometry args={[0.025, 0.005, 8, 12, Math.PI]} />
        <meshToonMaterial color={darkPointColor} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.02, 0.39, 0.5]} rotation={[0.1, -0.1, 0]}>
        <torusGeometry args={[0.025, 0.005, 8, 12, Math.PI]} />
        <meshToonMaterial color={darkPointColor} gradientMap={gradientMap} />
      </mesh>

      {/* Eyes - big, blue, expressive */}
      <group position={[-0.13, 0.54, 0.44]}>
        <mesh>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial color="#fff" roughness={0.05} />
        </mesh>
        <mesh position={[0.01, -0.01, 0.04]}>
          <sphereGeometry args={[0.065, 24, 24]} />
          <meshStandardMaterial color={p.eyeColor} roughness={0.1} metalness={0.2} />
        </mesh>
        <mesh position={[0.015, -0.015, 0.07]}>
          <sphereGeometry args={[0.04, 20, 20]} />
          <meshStandardMaterial color="#111" roughness={0.05} />
        </mesh>
        <mesh position={[-0.02, 0.03, 0.085]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[0.025, -0.015, 0.08]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>

      <group position={[0.13, 0.54, 0.44]}>
        <mesh>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial color="#fff" roughness={0.05} />
        </mesh>
        <mesh position={[-0.01, -0.01, 0.04]}>
          <sphereGeometry args={[0.065, 24, 24]} />
          <meshStandardMaterial color={p.eyeColor} roughness={0.1} metalness={0.2} />
        </mesh>
        <mesh position={[-0.015, -0.015, 0.07]}>
          <sphereGeometry args={[0.04, 20, 20]} />
          <meshStandardMaterial color="#111" roughness={0.05} />
        </mesh>
        <mesh position={[0.02, 0.03, 0.085]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
        <mesh position={[-0.025, -0.015, 0.08]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#fff" toneMapped={false} />
        </mesh>
      </group>

      {/* Ears — pointed cones, or folded caps pressed to the head */}
      {p.earStyle === 'point' ? (
        <>
          <group ref={earLRef} position={[-0.22, 0.82, 0.15]}>
            <mesh rotation={[0, 0, -0.15]}>
              <coneGeometry args={[0.1, 0.24, 4]} />
              <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, -0.01, 0.025]} rotation={[0, 0, -0.15]}>
              <coneGeometry args={[0.065, 0.16, 4]} />
              <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.22, 0.82, 0.15]}>
            <mesh rotation={[0, 0, 0.15]}>
              <coneGeometry args={[0.1, 0.24, 4]} />
              <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, -0.01, 0.025]} rotation={[0, 0, 0.15]}>
              <coneGeometry args={[0.065, 0.16, 4]} />
              <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
            </mesh>
          </group>
        </>
      ) : (
        <>
          <group ref={earLRef} position={[-0.2, 0.79, 0.16]}>
            <mesh rotation={[0.5, 0, -0.4]} scale={[1, 0.45, 0.8]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.2, 0.79, 0.16]}>
            <mesh rotation={[0.5, 0, 0.4]} scale={[1, 0.45, 0.8]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
            </mesh>
          </group>
        </>
      )}

      {/* Whiskers - delicate */}
      {[
        [-0.18, 0.43, 0.5, 0.12],
        [-0.2, 0.41, 0.49, 0.2],
        [-0.17, 0.39, 0.5, 0.08],
        [0.18, 0.43, 0.5, -0.12],
        [0.2, 0.41, 0.49, -0.2],
        [0.17, 0.39, 0.5, -0.08],
      ].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
          <capsuleGeometry args={[0.004, 0.16, 4, 4]} />
          <meshToonMaterial color="#ddd" gradientMap={gradientMap} />
        </mesh>
      ))}

      {/* Paws with pads */}
      {[
        [-0.15, -0.42, 0.15],
        [0.15, -0.42, 0.15],
        [-0.18, -0.42, -0.1],
        [0.18, -0.42, -0.1],
      ].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.08, 0.18, 12, 16]} />
            <meshToonMaterial color={i < 2 ? pointColor : darkPointColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.14, 0.03]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshToonMaterial color={pinkColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}

      {/* Tail - fluffy, segmented */}
      <group ref={tailRef} position={[0, 0.08, -0.42]}>
        <mesh rotation={[-0.7, 0, 0]}>
          <capsuleGeometry args={[0.065, 0.3, 12, 16]} />
          <meshToonMaterial color={pointColor} gradientMap={gradientMap} />
        </mesh>
        <group ref={tailTipRef} position={[0, 0.1, -0.28]}>
          <mesh rotation={[-0.3, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.2, 12, 16]} />
            <meshToonMaterial color={darkPointColor} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.12, -0.08]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshToonMaterial color={p.bellyColor} gradientMap={gradientMap} />
          </mesh>
        </group>
      </group>

      {/* Blush (when hovered) */}
      {isHovered && (
        <>
          <mesh position={[-0.24, 0.42, 0.42]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#ffaaaa" transparent opacity={0.35} toneMapped={false} />
          </mesh>
          <mesh position={[0.24, 0.42, 0.42]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#ffaaaa" transparent opacity={0.35} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
