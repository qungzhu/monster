import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { DogParams } from '../../data/breeds';
import { useFur } from './furTexture';

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
 * Parametric dog, realism pass: procedural fur maps on PBR materials
 * (no more flat toon plastic), organic ellipsoid anatomy with chest,
 * haunches and neck, glossy physical-material eyes with clearcoat.
 */
export function DogModel({ isHovered, params }: { isHovered: boolean; params?: DogParams }) {
  const p = params ?? goldenDefaults;
  const group = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earLRef = useRef<Group>(null);
  const earRRef = useRef<Group>(null);
  const tongueRef = useRef<Group>(null);

  const bodyFur = useFur(p.bodyColor, 11);
  const accentFur = useFur(p.accentColor, 12);
  const bellyFur = useFur(p.bellyColor, 9);

  const drop = (1 - p.legScale) * 0.28;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    group.current.scale.y = 1 + Math.sin(t * 2) * 0.018;
    group.current.position.y = Math.sin(t * 1.5) * 0.035 - drop;
    group.current.rotation.y = Math.sin(t * 0.5) * 0.12;

    if (tailRef.current) {
      const wagSpeed = isHovered ? 14 : 5;
      const wagAmount = (isHovered ? 0.7 : 0.35) * (p.tailStyle === 'curl' ? 0.45 : 1);
      tailRef.current.rotation.z = Math.sin(t * wagSpeed) * wagAmount;
      if (p.tailStyle === 'wag') tailRef.current.rotation.x = -0.6 + Math.sin(t * 3) * 0.1;
    }

    if (p.earStyle === 'floppy') {
      if (earLRef.current) earLRef.current.rotation.z = -0.3 + Math.sin(t * 1.8) * 0.1;
      if (earRRef.current) earRRef.current.rotation.z = 0.3 - Math.sin(t * 1.8) * 0.1;
    } else {
      if (earLRef.current) earLRef.current.rotation.z = -0.08 + (Math.sin(t * 2.6) > 0.94 ? 0.12 : 0);
      if (earRRef.current) earRRef.current.rotation.z = 0.08 - (Math.cos(t * 2.2) > 0.94 ? 0.12 : 0);
    }

    if (tongueRef.current) tongueRef.current.scale.y = 1 + Math.sin(t * 4) * 0.15;

    if (isHovered) {
      group.current.position.y = Math.abs(Math.sin(t * 6)) * 0.15 - drop;
      group.current.rotation.z = Math.sin(t * 4) * 0.05;
    }
  });

  const furBody = <meshStandardMaterial map={bodyFur.map} bumpMap={bodyFur.bumpMap} bumpScale={2.2} color="#ffffff" roughness={0.92} />;
  const furAccent = <meshStandardMaterial map={accentFur.map} bumpMap={accentFur.bumpMap} bumpScale={2.4} color="#ffffff" roughness={0.94} />;
  const furBelly = <meshStandardMaterial map={bellyFur.map} bumpMap={bellyFur.bumpMap} bumpScale={1.8} color="#ffffff" roughness={0.9} />;

  return (
    <group ref={group}>
      {/* Body — ovoid, longer than tall */}
      <mesh position={[0, -0.06, -0.02]} scale={[0.95, 0.88, 1.18]} castShadow>
        <sphereGeometry args={[0.52, 48, 48]} />
        {furBody}
      </mesh>

      {/* Chest — deeper, fluffier */}
      <mesh position={[0, -0.1, 0.26]} scale={[0.82, 0.95, 0.9]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        {furBelly}
      </mesh>

      {/* Haunches — rear leg thighs */}
      <mesh position={[-0.3, -0.22, -0.32]} scale={[0.55, 0.85, 0.85]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        {furBody}
      </mesh>
      <mesh position={[0.3, -0.22, -0.32]} scale={[0.55, 0.85, 0.85]}>
        <sphereGeometry args={[0.3, 24, 24]} />
        {furBody}
      </mesh>

      {/* Neck bridging head and body */}
      <mesh position={[0, 0.28, 0.14]} scale={[0.8, 1, 0.85]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        {furBody}
      </mesh>

      {/* Head — slightly ovoid */}
      <mesh position={[0, 0.52, 0.2]} scale={[0.95, 0.92, 0.98]} castShadow>
        <sphereGeometry args={[0.42, 48, 48]} />
        {furBody}
      </mesh>

      {/* Brow ridges */}
      <mesh position={[-0.15, 0.71, 0.42]} scale={[1.4, 0.55, 0.8]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        {furBody}
      </mesh>
      <mesh position={[0.15, 0.71, 0.42]} scale={[1.4, 0.55, 0.8]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        {furBody}
      </mesh>

      {/* Muzzle — tapered, not a ball */}
      <mesh position={[0, 0.41, 0.52]} scale={[0.75, 0.62, 1.05]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        {furBelly}
      </mesh>
      {/* Lower jaw */}
      <mesh position={[0, 0.33, 0.5]} scale={[0.6, 0.4, 0.8]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        {furBelly}
      </mesh>

      {/* Nose — wet leather look */}
      <mesh position={[0, 0.46, 0.73]} scale={[1.15, 0.85, 0.9]}>
        <sphereGeometry args={[0.06, 24, 24]} />
        <meshPhysicalMaterial color="#1a1614" roughness={0.25} clearcoat={0.8} clearcoatRoughness={0.3} />
      </mesh>

      {/* Eyes — almond shaped, glossy cornea */}
      {[-0.15, 0.15].map((x, side) => (
        <group key={side} position={[x, 0.6, 0.5]} rotation={[0, side === 0 ? -0.15 : 0.15, 0]}>
          {/* Socket shading */}
          <mesh position={[0, 0, -0.005]} scale={[1.15, 1.2, 0.7]}>
            <sphereGeometry args={[0.085, 20, 20]} />
            <meshStandardMaterial color={p.accentColor} roughness={1} />
          </mesh>
          <mesh scale={[1, 1.12, 0.75]}>
            <sphereGeometry args={[0.078, 24, 24]} />
            <meshStandardMaterial color="#f8f4ee" roughness={0.35} />
          </mesh>
          <mesh position={[side === 0 ? 0.012 : -0.012, -0.008, 0.038]} scale={[1, 1.05, 0.8]}>
            <sphereGeometry args={[0.055, 20, 20]} />
            <meshPhysicalMaterial color={p.eyeColor} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
          </mesh>
          <mesh position={[side === 0 ? 0.018 : -0.018, -0.012, 0.062]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshPhysicalMaterial color="#0a0603" roughness={0.05} clearcoat={1} />
          </mesh>
          <mesh position={[-0.015 + side * 0.03, 0.025, 0.072]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshBasicMaterial color="#fff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Ears */}
      {p.earStyle === 'floppy' ? (
        <>
          <group ref={earLRef} position={[-0.3, 0.8, 0.14]}>
            <mesh rotation={[0.25, 0, -0.35]} scale={[0.85, 1, 0.45]}>
              <sphereGeometry args={[0.17, 24, 24]} />
              {furAccent}
            </mesh>
          </group>
          <group ref={earRRef} position={[0.3, 0.8, 0.14]}>
            <mesh rotation={[0.25, 0, 0.35]} scale={[0.85, 1, 0.45]}>
              <sphereGeometry args={[0.17, 24, 24]} />
              {furAccent}
            </mesh>
          </group>
        </>
      ) : (
        <>
          <group ref={earLRef} position={[-0.22, 0.88, 0.12]}>
            <mesh rotation={[0, 0, -0.12]} scale={[1, 1, 0.55]}>
              <coneGeometry args={[0.12, 0.3, 24]} />
              {furAccent}
            </mesh>
            <mesh position={[0, -0.02, 0.045]} rotation={[0.08, 0, -0.12]} scale={[0.55, 0.75, 0.4]}>
              <coneGeometry args={[0.1, 0.22, 16]} />
              <meshStandardMaterial color="#D9A8A0" roughness={0.85} />
            </mesh>
          </group>
          <group ref={earRRef} position={[0.22, 0.88, 0.12]}>
            <mesh rotation={[0, 0, 0.12]} scale={[1, 1, 0.55]}>
              <coneGeometry args={[0.12, 0.3, 24]} />
              {furAccent}
            </mesh>
            <mesh position={[0, -0.02, 0.045]} rotation={[0.08, 0, 0.12]} scale={[0.55, 0.75, 0.4]}>
              <coneGeometry args={[0.1, 0.22, 16]} />
              <meshStandardMaterial color="#D9A8A0" roughness={0.85} />
            </mesh>
          </group>
        </>
      )}

      {/* Legs with paws */}
      {[[-0.2, 0.2], [0.2, 0.2], [-0.24, -0.28], [0.24, -0.28]].map(([x, z], i) => (
        <group key={i} position={[x, -0.48 + (1 - p.legScale) * 0.11, z]}>
          <mesh castShadow scale={[1, p.legScale, 1]}>
            <capsuleGeometry args={[0.09, 0.24, 12, 16]} />
            {furBody}
          </mesh>
          <mesh position={[0, -0.17 * p.legScale, 0.035]} scale={[1.05, 0.7, 1.25]}>
            <sphereGeometry args={[0.095, 16, 16]} />
            {furBelly}
          </mesh>
        </group>
      ))}

      {/* Tail */}
      {p.tailStyle === 'wag' ? (
        <group ref={tailRef} position={[0, 0.12, -0.52]}>
          <mesh rotation={[-0.6, 0, 0]} scale={[1, 1, 1]}>
            <capsuleGeometry args={[0.07, 0.34, 12, 16]} />
            {furAccent}
          </mesh>
          <mesh position={[0, 0.22, -0.15]} scale={[1, 1.15, 1]}>
            <sphereGeometry args={[0.085, 16, 16]} />
            {furBelly}
          </mesh>
        </group>
      ) : (
        <group ref={tailRef} position={[0, 0.26, -0.46]}>
          <mesh rotation={[0.4, 0.5, 0]}>
            <torusGeometry args={[0.14, 0.065, 14, 24, Math.PI * 1.4]} />
            {furAccent}
          </mesh>
        </group>
      )}

      {/* Tongue */}
      {isHovered && (
        <group ref={tongueRef} position={[0, 0.32, 0.68]} rotation={[0.45, 0, 0]}>
          <mesh scale={[1, 1, 0.5]}>
            <capsuleGeometry args={[0.045, 0.12, 8, 12]} />
            <meshPhysicalMaterial color="#e0596e" roughness={0.35} clearcoat={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}
