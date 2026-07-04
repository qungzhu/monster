import { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { Group } from 'three';
import * as THREE from 'three';
import { DogModel } from './DogModel';
import { CatModel } from './CatModel';
import { HamsterModel } from './HamsterModel';
import { GLBPet } from './GLBPet';
import { glbModels } from '../../data/petModels';
import type { Character } from '../../data/characters';

interface PetSelectStageProps {
  characters: Character[];
  onSelect: (id: string) => void;
}

/**
 * Arc layout tuned for portrait phones: the visible width at the
 * center plane is only ~2 units, so side pets sit further back
 * (larger camera distance = wider visible span) and everything is
 * scaled down to fit three across.
 */
const stageSlots: Record<string, { x: number; z: number; scale: number; rotY: number; color: string }> = {
  tuantuan: { x: -0.95, z: -0.9, scale: 0.64, rotY: 0, color: '#d97706' },
  xiaoxue: { x: 0, z: 0.15, scale: 0.68, rotY: 0, color: '#7c3aed' },
  mianhuatang: { x: 0.95, z: -0.9, scale: 0.64, rotY: -0.12, color: '#ec4899' },
};

const GROUND_Y = -0.65;

function ProceduralFor({ characterId, isHovered }: { characterId: string; isHovered: boolean }) {
  switch (characterId) {
    case 'xiaoxue': return <CatModel isHovered={isHovered} />;
    case 'mianhuatang': return <HamsterModel isHovered={isHovered} />;
    default: return <DogModel isHovered={isHovered} />;
  }
}

function StagePet({
  character,
  hovered,
  dimmed,
  onHover,
  onSelect,
}: {
  character: Character;
  hovered: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<Group>(null);
  const slot = stageSlots[character.id] || stageSlots.tuantuan;
  const glbConfig = glbModels[character.id];

  useFrame((_, delta) => {
    if (!group.current) return;
    // Clamp the smoothing factor: on a dropped frame delta spikes and an
    // unclamped lerp alpha > 1 extrapolates past the target (negative scale).
    const a = Math.min(1, delta * 6);
    const factor = hovered ? 1.18 : dimmed ? 0.9 : 1;
    const target = slot.scale * factor;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), a);
    // Models keep their feet at GROUND_Y in local space; after scaling,
    // shift the group down so scaled feet still touch the ground.
    const baseY = GROUND_Y * (1 - target);
    const targetY = baseY + (hovered ? 0.1 : 0);
    group.current.position.y += (targetY - group.current.position.y) * a;
  });

  return (
    <group position={[slot.x, 0, slot.z]}>
      {/* Clickable pet */}
      <group
        ref={group}
        rotation={[0, slot.rotY, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(character.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(character.id); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
      >
        {glbConfig ? (
          <Suspense fallback={<ProceduralFor characterId={character.id} isHovered={hovered} />}>
            <GLBPet config={glbConfig} isHovered={hovered} />
          </Suspense>
        ) : (
          <ProceduralFor characterId={character.id} isHovered={hovered} />
        )}
        {/* Invisible hit box so small pets are easy to tap.
            Kept narrow so the front pet doesn't swallow taps aimed at
            its neighbors (raycast picks the nearest hit). */}
        <mesh visible={false} position={[0, 0.1, 0]}>
          <boxGeometry args={[1.2, 2.2, 1.2]} />
          <meshBasicMaterial />
        </mesh>
      </group>

      {/* Colored spotlight glow under each pet */}
      <pointLight position={[0, 1.4, 0.5]} intensity={hovered ? 1.2 : 0.35} color={slot.color} distance={3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.01, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color={slot.color} transparent opacity={hovered ? 0.28 : 0.1} toneMapped={false} />
      </mesh>

      {/* Name label */}
      <Html position={[0, GROUND_Y - 0.28, 0]} center distanceFactor={5.5} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div className="flex flex-col items-center gap-1" style={{ width: 120 }}>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap"
            style={{
              color: '#fff',
              background: hovered ? `${slot.color}cc` : 'rgba(0,0,0,0.55)',
              border: `1px solid ${slot.color}66`,
              backdropFilter: 'blur(8px)',
              transition: 'all .25s',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {character.avatar} {character.name}
          </span>
          <span
            className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full"
            style={{
              color: slot.color,
              background: 'rgba(0,0,0,0.4)',
              opacity: hovered ? 1 : 0.7,
              transition: 'opacity .25s',
            }}
          >
            {character.title}
          </span>
        </div>
      </Html>
    </group>
  );
}

export function PetSelectStage({ characters, onSelect }: PetSelectStageProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (selectedId) return;
    setSelectedId(id);
    // Let the pick animation play before switching screens
    setTimeout(() => onSelect(id), 450);
  };

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.15, 5.2], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} color="#f8f0ff" />
          <directionalLight position={[4, 6, 4]} intensity={1.4} color="#fff8f0" castShadow />
          <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#e0d0ff" />
          <hemisphereLight args={['#ffeedd', '#332244', 0.35]} />

          {characters.map(char => (
            <StagePet
              key={char.id}
              character={char}
              hovered={hoveredId === char.id || selectedId === char.id}
              dimmed={(hoveredId !== null && hoveredId !== char.id) || (selectedId !== null && selectedId !== char.id)}
              onHover={setHoveredId}
              onSelect={handleSelect}
            />
          ))}

          <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={8} blur={2.5} far={1.5} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.4} intensity={0.7} mipmapBlur />
            <Vignette eskil={false} offset={0.1} darkness={0.45} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
