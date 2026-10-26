import { useState, Suspense, useMemo, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { DogModel } from './DogModel';
import { CatModel } from './CatModel';
import { HamsterModel } from './HamsterModel';
import { PetParticles } from './PetParticles';
import { GLBPet } from './GLBPet';
import type { EmoteKind } from './GLBPet';
import { glbModels } from '../../data/petModels';
import { WinterScene } from '../world/WinterScene';
import { getBreed } from '../../data/breeds';
import type { Breed, CatParams, DogParams, FoxParams } from '../../data/breeds';
import * as THREE from 'three';

interface PetSceneProps {
  characterId: string;
  /** When set, visuals come from the breed registry instead of the legacy character. */
  breedId?: string | null;
  /** Inline breed object (photo-generated custom pets, live previews). Wins over breedId. */
  customBreed?: Breed | null;
  /** 'world' fills its container and renders the full winter set — used by the Living World. */
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'picker' | 'world';
  interactive?: boolean;
  /** Procedural emote for GLB pets. */
  emote?: EmoteKind | null;
}

const sceneConfig: Record<string, { camera: [number, number, number]; color: string }> = {
  tuantuan: { camera: [0, 0.3, 2.8], color: '#d97706' },
  xiaoxue: { camera: [0, 0.3, 2.8], color: '#7c3aed' },
  mianhuatang: { camera: [0, 0.2, 2.5], color: '#ec4899' },
};

const sizeMap = {
  tiny: 'h-10 w-10',
  small: 'h-32 w-32',
  medium: 'h-48 w-48',
  large: 'h-64 w-64',
  picker: 'h-full w-full',
  world: 'h-full w-full',
};

function ProceduralModel({ characterId, isHovered }: { characterId: string; isHovered: boolean }) {
  switch (characterId) {
    case 'tuantuan': return <DogModel isHovered={isHovered} />;
    case 'xiaoxue': return <CatModel isHovered={isHovered} />;
    case 'mianhuatang': return <HamsterModel isHovered={isHovered} />;
    default: return <DogModel isHovered={isHovered} />;
  }
}

/** Falls back to the procedural model if the GLB fails to load. */
class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function PetModel({ characterId, breedId, customBreed, isHovered, emote }: { characterId: string; breedId?: string | null; customBreed?: Breed | null; isHovered: boolean; emote?: EmoteKind | null }) {
  const breed = customBreed ?? getBreed(breedId ?? null);

  // Breed-driven rendering: parametric bodies for cats/dogs/hamsters,
  // tinted GLB for foxes. A photo-reconstructed mesh wins over params.
  if (breed) {
    if (breed.glbUrl) {
      const meshConfig = {
        url: breed.glbUrl,
        scale: 1,
        yOffset: -0.65 + (breed.glbGroundOffset ?? 0),
        facingY: breed.glbRotationY,
        // Rigged breeds carry an 'Idle' clip (e.g. retargeted look-around);
        // static breeds simply have no matching action and skip it.
        idleAnimation: breed.glbIdleAnimation ?? 'Idle',
        hoverAnimation: '',
        walkAnimation: breed.glbWalkAnimation,
        removeFlatBase: breed.glbRemoveFlatBase,
        disableSkeletalAnimation: breed.glbDisableSkeletalAnimation,
      };
      const fallback = breed.species === 'cat'
        ? <CatModel isHovered={isHovered} params={breed.params as CatParams} />
        : breed.species === 'hamster'
          ? <HamsterModel isHovered={isHovered} />
          : <DogModel isHovered={isHovered} params={breed.params as DogParams} />;
      return (
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={null}>
            <GLBPet config={meshConfig} isHovered={isHovered} normalize emote={emote} />
          </Suspense>
        </ModelErrorBoundary>
      );
    }
    switch (breed.species) {
      case 'cat':
        return <CatModel isHovered={isHovered} params={breed.params as CatParams} />;
      case 'dog':
        return <DogModel isHovered={isHovered} params={breed.params as DogParams} />;
      case 'hamster':
        return <HamsterModel isHovered={isHovered} />;
      case 'fox': {
        const foxConfig = glbModels.tuantuan;
        const fallback = <DogModel isHovered={isHovered} />;
        return (
          <ModelErrorBoundary fallback={fallback}>
            <Suspense fallback={fallback}>
              <GLBPet config={foxConfig} isHovered={isHovered} tint={(breed.params as FoxParams)?.tint} />
            </Suspense>
          </ModelErrorBoundary>
        );
      }
    }
  }

  const glbConfig = glbModels[characterId];
  const procedural = <ProceduralModel characterId={characterId} isHovered={isHovered} />;

  if (!glbConfig) return procedural;

  return (
    <ModelErrorBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GLBPet config={glbConfig} isHovered={isHovered} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/**
 * Plush-toy studio lighting. Stuffed toys read as soft because they are lit
 * by big diffuse sources from every side plus a backlight that makes the
 * fuzz glow along the silhouette. So: a locally generated softbox
 * environment (no network fetch) that the fabric sheen can pick up, a soft
 * low-contrast key, and a warm rim light from behind.
 */
export function PlushLighting({ color }: { color: string }) {
  return (
    <>
      <Environment resolution={128} frames={1} environmentIntensity={0.3}>
        {/* big warm softbox above-front */}
        <Lightformer form="rect" intensity={2.2} color="#fff3e4" position={[0, 4, 4]} rotation-x={-Math.PI / 4} scale={[8, 4, 1]} />
        {/* cool side fills */}
        <Lightformer form="rect" intensity={1.1} color="#e8eeff" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#fff0f4" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[4, 4, 1]} />
        {/* warm back panel -> fuzzy rim */}
        <Lightformer form="rect" intensity={2.6} color="#fff6ea" position={[0, 2, -5]} scale={[8, 5, 1]} />
        {/* snow bounce from below */}
        <Lightformer form="rect" intensity={0.8} color="#f4f8ff" position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <ambientLight intensity={0.65} color="#fff6ee" />
      <hemisphereLight args={['#fff4e8', '#c8d4ee', 0.75]} />
      {/* soft, low-contrast key */}
      <directionalLight
        position={[3, 6, 5]}
        intensity={0.95}
        color="#fff6ec"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-radius={6}
      />
      {/* warm rim from behind: makes the fur edge glow like a plush toy */}
      <directionalLight position={[-1.5, 3, -5]} intensity={0.9} color="#ffe9d2" />
      <directionalLight position={[2, 2.5, -4]} intensity={0.5} color="#ffeef6" />
      <pointLight position={[0, 1, 3]} intensity={0.25} color={color} distance={8} />
    </>
  );
}

function GroundPlane({ color }: { color: string }) {
  const gradientMap = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]),
      3, 1, THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <>
      <ContactShadows
        position={[0, -0.65, 0]}
        opacity={0.4}
        scale={4}
        blur={2.5}
        far={1.5}
        color={color}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]} receiveShadow>
        <circleGeometry args={[1.5, 32]} />
        <meshToonMaterial
          color={color}
          transparent
          opacity={0.08}
          gradientMap={gradientMap}
        />
      </mesh>
    </>
  );
}

export function PetScene({ characterId, breedId, customBreed, size = 'medium', interactive = true, emote }: PetSceneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = sceneConfig[characterId] || sceneConfig.tuantuan;
  const sizeClass = sizeMap[size];
  const isTiny = size === 'tiny';
  const isPicker = size === 'picker';
  const isWorld = size === 'world';
  const isLarge = size === 'large' || isWorld;

  return (
    <div
      className={`${sizeClass} ${isWorld ? '' : 'rounded-2xl cursor-pointer'} overflow-hidden relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 1000)}
    >
      {/* Glow effect */}
      {!isWorld && !isPicker && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at 50% 60%, ${config.color}28 0%, transparent 65%)`,
            opacity: isHovered ? 0.8 : 0.4,
            transition: 'opacity 0.3s',
          }}
        />
      )}

      <ModelErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center text-4xl">🐾</div>}>
      <Canvas
        camera={{ position: isWorld ? [0, 0.75, 5.6] : isPicker ? [0, 0.3, 3.5] : config.camera, fov: isTiny ? 50 : isWorld ? 45 : 40 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
        shadows
      >
        <Suspense fallback={null}>
          <PlushLighting color={config.color} />

          <PetModel characterId={characterId} breedId={breedId} customBreed={customBreed} isHovered={isHovered} emote={emote} />

          {/* Large view = the Living World: full Frozen winter set.
              Smaller views keep the lightweight color disc. */}
          {isLarge ? (
            <>
              <WinterScene />
              <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={3.5} blur={2.2} far={1.2} color="#2a4a7a" />
            </>
          ) : !isTiny && !isPicker && <GroundPlane color={config.color} />}

          {isLarge && <PetParticles color={isWorld ? '#cfe6ff' : config.color} count={12} />}

          {interactive && !isTiny && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
              rotateSpeed={0.5}
            />
          )}

          {!isTiny && !isPicker && (
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.85}
                luminanceSmoothing={0.4}
                intensity={isLarge ? 0.8 : 0.5}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.1} darkness={0.4} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
      </ModelErrorBoundary>

      {/* Interaction hint */}
      {isHovered && interactive && !isTiny && !isWorld && !isPicker && (
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[9px] text-text-muted bg-surface/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            拖动旋转 ✨
          </span>
        </div>
      )}
    </div>
  );
}
