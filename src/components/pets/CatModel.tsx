import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { CatParams } from '../../data/breeds';
import { useFur } from './furTexture';

const ragdollDefaults: CatParams = {
  bodyColor: '#F0EAE8',
  pointColor: '#C8B8B0',
  bellyColor: '#FAFAFA',
  eyeColor: '#5588DD',
  earStyle: 'point',
};

/**
 * Parametric cat, realism pass: procedural fur on PBR materials,
 * ovoid anatomy with haunches and chest ruff, big glossy eyes with
 * clearcoat cornea and vertical-feel pupils.
 */
export function CatModel({ isHovered, params }: { isHovered: boolean; params?: CatParams }) {
  const p = params ?? ragdollDefaults;
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const tailTipRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);

  const bodyFur = useFur(p.bodyColor, 13);
  const pointFur = useFur(p.pointColor, 12);
  const bellyFur = useFur(p.bellyColor, 14);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 1.5) * 0.014;
    group.current.position.y = Math.sin(t * 1.2) * 0.03;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.1;

    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 1.8) * 0.35;
      tailRef.current.rotation.x = -0.7 + Math.sin(t * 1.2) * 0.15;
    }
    if (tailTipRef.current) tailTipRef.current.rotation.z = Math.sin(t * 2.5 + 1) * 0.4;

    if (earLRef.current) earLRef.current.rotation.z = -0.15 + (Math.sin(t * 3) > 0.93 ? 0.18 : 0);
    if (earRRef.current) earRRef.current.rotation.z = 0.15 - (Math.cos(t * 2.7) > 0.93 ? 0.18 : 0);

    if (isHovered) {
      group.current.rotation.y = Math.sin(t * 0.3) * 0.05;
    }
  });

  const furBody = <meshStandardMaterial map={bodyFur.map} bumpMap={bodyFur.bumpMap} bumpScale={2.4} roughness={0.93} />;
  const furPoint = <meshStandardMaterial map={pointFur.map} bumpMap={pointFur.bumpMap} bumpScale={2.6} roughness={0.94} />;
  const furBelly = <meshStandardMaterial map={bellyFur.map} bumpMap={bellyFur.bumpMap} bumpScale={2} roughness={0.9} />;

  return (
    <group ref={group}>
      {/* Body — pear-shaped, wider at the haunches */}
      <mesh position={[0, -0.08, -0.02]} scale={[0.92, 0.9, 1.08]} castShadow>
        <sphereGeometry args={[0.48, 48, 48]} />
        {furBody}
      </mesh>

      {/* Haunches */}
      <mesh position={[-0.26, -0.24, -0.22]} scale={[0.6, 0.9, 0.9]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        {furBody}
      </mesh>
      <mesh position={[0.26, -0.24, -0.22]} scale={[0.6, 0.9, 0.9]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        {furBody}
      </mesh>

      {/* Chest ruff — layered fluff */}
      <mesh position={[0, 0.08, 0.22]} scale={[0.85, 1, 0.8]}>
        <sphereGeometry args={[0.34, 32, 32]} />
        {furBelly}
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.48, 0.16]} scale={[0.98, 0.9, 0.92]} castShadow>
        <sphereGeometry args={[0.38, 48, 48]} />
        {furBody}
      </mesh>

      {/* Cheek fluff */}
      <mesh position={[-0.24, 0.4, 0.3]} scale={[0.9, 0.75, 0.7]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        {furBelly}
      </mesh>
      <mesh position={[0.24, 0.4, 0.3]} scale={[0.9, 0.75, 0.7]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        {furBelly}
      </mesh>

      {/* Face mask marking */}
      <mesh position={[0, 0.52, 0.33]} scale={[1, 0.85, 0.85]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        {furPoint}
      </mesh>

      {/* Muzzle */}
      <mesh position={[0, 0.42, 0.47]} scale={[0.8, 0.55, 0.7]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        {furBelly}
      </mesh>

      {/* Nose — small glossy triangle feel */}
      <mesh position={[0, 0.455, 0.55]} scale={[1.2, 0.8, 0.7]}>
        <sphereGeometry args={[0.032, 20, 20]} />
        <meshPhysicalMaterial color={p.noseColor ?? '#D98A8A'} roughness={0.3} clearcoat={0.7} />
      </mesh>

      {/* Eyes — large, glossy, slightly angled */}
      {[-0.14, 0.14].map((x, side) => (
        <group key={side} position={[x, 0.55, 0.42]} rotation={[0, side === 0 ? -0.2 : 0.2, side === 0 ? 0.08 : -0.08]}>
          <mesh position={[0, 0, -0.008]} scale={[1.18, 1.15, 0.7]}>
            <sphereGeometry args={[0.08, 20, 20]} />
            <meshStandardMaterial color={p.pointColor} roughness={1} />
          </mesh>
          <mesh scale={[1, 1.08, 0.72]}>
            <sphereGeometry args={[0.075, 24, 24]} />
            <meshStandardMaterial color="#f5f2ec" roughness={0.3} />
          </mesh>
          <mesh position={[side === 0 ? 0.008 : -0.008, -0.006, 0.035]} scale={[1, 1.1, 0.8]}>
            <sphereGeometry args={[0.056, 20, 20]} />
            <meshPhysicalMaterial color={p.eyeColor} roughness={0.12} clearcoat={1} clearcoatRoughness={0.08} />
          </mesh>
          {/* Vertical-ellipse pupil */}
          <mesh position={[side === 0 ? 0.012 : -0.012, -0.008, 0.058]} scale={[0.55, 1.15, 0.7]}>
            <sphereGeometry args={[0.032, 16, 16]} />
            <meshPhysicalMaterial color="#0a0806" roughness={0.05} clearcoat={1} />
          </mesh>
          <mesh position={[-0.014 + side * 0.028, 0.022, 0.065]}>
            <sphereGeometry args={[0.016, 10, 10]} />
            <meshBasicMaterial color="#fff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Ears */}
      {p.earStyle === 'point' ? (
        <>
          <group ref={earLRef} position={[-0.21, 0.8, 0.12]}>
            <mesh rotation={[0.05, 0, -0.15]} scale={[1, 1, 0.5]}>
              <coneGeometry args={[0.11, 0.26, 24]} />
              {furPoint}
            </mesh>
            <mesh position={[0, -0.02, 0.04]} rotation={[0.1, 0, -0.15]} scale={[0.55, 0.7, 0.35]}>
              <coneGeometry args={[0.09, 0.19, 16]} />
              <meshStandardMaterial color="#D9A8A8" roughness={0.85} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.21, 0.8, 0.12]}>
            <mesh rotation={[0.05, 0, 0.15]} scale={[1, 1, 0.5]}>
              <coneGeometry args={[0.11, 0.26, 24]} />
              {furPoint}
            </mesh>
            <mesh position={[0, -0.02, 0.04]} rotation={[0.1, 0, 0.15]} scale={[0.55, 0.7, 0.35]}>
              <coneGeometry args={[0.09, 0.19, 16]} />
              <meshStandardMaterial color="#D9A8A8" roughness={0.85} />
            </mesh>
          </group>
        </>
      ) : (
        <>
          <group ref={earLRef} position={[-0.19, 0.77, 0.15]}>
            <mesh rotation={[0.5, 0, -0.4]} scale={[1, 0.45, 0.8]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              {furPoint}
            </mesh>
          </group>
          <group ref={earRRef} position={[0.19, 0.77, 0.15]}>
            <mesh rotation={[0.5, 0, 0.4]} scale={[1, 0.45, 0.8]}>
              <sphereGeometry args={[0.11, 20, 20]} />
              {furPoint}
            </mesh>
          </group>
        </>
      )}

      {/* Whiskers */}
      {[
        [-0.2, 0.44, 0.48, 0.15], [-0.22, 0.41, 0.47, 0.28], [-0.19, 0.38, 0.48, 0.05],
        [0.2, 0.44, 0.48, -0.15], [0.22, 0.41, 0.47, -0.28], [0.19, 0.38, 0.48, -0.05],
      ].map(([x, y, z, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, rot]}>
          <capsuleGeometry args={[0.0028, 0.18, 4, 4]} />
          <meshStandardMaterial color="#e8e4de" roughness={0.4} transparent opacity={0.75} />
        </mesh>
      ))}

      {/* Front legs */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={i} position={[x, -0.42, 0.16]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.075, 0.2, 12, 16]} />
            {furBody}
          </mesh>
          <mesh position={[0, -0.15, 0.03]} scale={[1, 0.7, 1.2]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            {furBelly}
          </mesh>
        </group>
      ))}
      {/* Rear paws peeking out */}
      {[-0.26, 0.26].map((x, i) => (
        <mesh key={i} position={[x, -0.5, -0.08]} scale={[1, 0.65, 1.3]} castShadow>
          <sphereGeometry args={[0.085, 16, 16]} />
          {furBody}
        </mesh>
      ))}

      {/* Tail — long, tapering, fluffy tip */}
      <group ref={tailRef} position={[0, 0.06, -0.44]}>
        <mesh rotation={[-0.7, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.3, 12, 16]} />
          {furPoint}
        </mesh>
        <group ref={tailTipRef} position={[0, 0.1, -0.28]}>
          <mesh rotation={[-0.3, 0, 0]}>
            <capsuleGeometry args={[0.055, 0.2, 12, 16]} />
            {furPoint}
          </mesh>
          <mesh position={[0, 0.12, -0.08]} scale={[1, 1.2, 1]}>
            <sphereGeometry args={[0.075, 16, 16]} />
            {furBelly}
          </mesh>
        </group>
      </group>
    </group>
  );
}
