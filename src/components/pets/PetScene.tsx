import { useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { DogModel } from './DogModel';
import { CatModel } from './CatModel';
import { HamsterModel } from './HamsterModel';
import { PetParticles } from './PetParticles';
import * as THREE from 'three';

interface PetSceneProps {
  characterId: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  interactive?: boolean;
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
};

function PetModel({ characterId, isHovered }: { characterId: string; isHovered: boolean }) {
  switch (characterId) {
    case 'tuantuan': return <DogModel isHovered={isHovered} />;
    case 'xiaoxue': return <CatModel isHovered={isHovered} />;
    case 'mianhuatang': return <HamsterModel isHovered={isHovered} />;
    default: return <DogModel isHovered={isHovered} />;
  }
}

function ToonLighting({ color }: { color: string }) {
  return (
    <>
      <ambientLight intensity={0.5} color="#f8f0ff" />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#e0d0ff" />
      <pointLight position={[0, 1, 3]} intensity={0.6} color={color} distance={8} />
      <pointLight position={[0, -1, 0]} intensity={0.2} color={color} distance={4} />
      <hemisphereLight args={['#ffeedd', '#332244', 0.3]} />
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

export function PetScene({ characterId, size = 'medium', interactive = true }: PetSceneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = sceneConfig[characterId] || sceneConfig.tuantuan;
  const sizeClass = sizeMap[size];
  const isTiny = size === 'tiny';
  const isLarge = size === 'large';

  return (
    <div
      className={`${sizeClass} rounded-2xl overflow-hidden relative cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 1000)}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${config.color}28 0%, transparent 65%)`,
          opacity: isHovered ? 0.8 : 0.4,
          transition: 'opacity 0.3s',
        }}
      />

      <Canvas
        camera={{ position: config.camera, fov: isTiny ? 50 : 40 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        shadows
      >
        <Suspense fallback={null}>
          <ToonLighting color={config.color} />

          <PetModel characterId={characterId} isHovered={isHovered} />

          {!isTiny && <GroundPlane color={config.color} />}

          {isLarge && <PetParticles color={config.color} />}

          {interactive && !isTiny && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
              rotateSpeed={0.5}
            />
          )}

          <Environment preset="apartment" />

          {!isTiny && (
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.6}
                luminanceSmoothing={0.4}
                intensity={isLarge ? 0.8 : 0.5}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.1} darkness={0.4} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* Interaction hint */}
      {isHovered && interactive && !isTiny && (
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[9px] text-text-muted bg-surface/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            拖动旋转 ✨
          </span>
        </div>
      )}
    </div>
  );
}
