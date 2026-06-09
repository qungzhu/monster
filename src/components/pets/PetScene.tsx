import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { DogModel } from './DogModel';
import { CatModel } from './CatModel';
import { HamsterModel } from './HamsterModel';

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

export function PetScene({ characterId, size = 'medium', interactive = true }: PetSceneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = sceneConfig[characterId] || sceneConfig.tuantuan;
  const sizeClass = sizeMap[size];

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
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, ${config.color}33 0%, transparent 70%)`,
        }}
      />

      <Canvas
        camera={{ position: config.camera, fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={0.8} color="#fff8f0" />
          <directionalLight position={[-2, 3, -1]} intensity={0.3} color="#e0d0ff" />
          <pointLight position={[0, 0, 3]} intensity={0.4} color={config.color} />

          <PetModel characterId={characterId} isHovered={isHovered} />

          <ContactShadows
            position={[0, -0.65, 0]}
            opacity={0.3}
            scale={3}
            blur={2}
            far={1}
          />

          {interactive && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
              rotateSpeed={0.5}
            />
          )}

          <Environment preset="apartment" />
        </Suspense>
      </Canvas>

      {/* Interaction hint */}
      {isHovered && (
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[9px] text-text-muted bg-surface/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            拖动旋转 ✨
          </span>
        </div>
      )}
    </div>
  );
}
