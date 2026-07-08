import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Winter set dressing, realism pass: textured snow with sparkle
 * bump, smooth-shaded mountains with rock/snow blending, soft
 * rolling drifts and fuller pines — matches the furry PBR pets.
 * All textures procedural + deterministic (seeded RNG).
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let snowCache: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

/** Snow surface: soft blue-white mottling + glinting ice crystals. */
function makeSnowMaps() {
  if (snowCache) return snowCache;
  const size = 512;
  const rand = mulberry32(20260707);

  const diff = document.createElement('canvas');
  diff.width = size; diff.height = size;
  const d = diff.getContext('2d')!;
  d.fillStyle = '#e8eff9';
  d.fillRect(0, 0, size, size);

  const bump = document.createElement('canvas');
  bump.width = size; bump.height = size;
  const b = bump.getContext('2d')!;
  b.fillStyle = '#808080';
  b.fillRect(0, 0, size, size);

  // Soft mottled patches (wind-blown snow)
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, r = 8 + rand() * 34;
    const tone = rand();
    d.fillStyle = tone > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(176,196,226,0.14)';
    d.beginPath(); d.arc(x, y, r, 0, 7); d.fill();
    b.fillStyle = tone > 0.5 ? 'rgba(196,196,196,0.5)' : 'rgba(110,110,110,0.5)';
    b.beginPath(); b.arc(x, y, r, 0, 7); b.fill();
  }
  // Ice-crystal glints
  for (let i = 0; i < 480; i++) {
    const x = rand() * size, y = rand() * size;
    d.fillStyle = `rgba(255,255,255,${0.5 + rand() * 0.5})`;
    d.fillRect(x, y, 1.3, 1.3);
    b.fillStyle = '#ffffff';
    b.fillRect(x, y, 1.3, 1.3);
  }

  const map = new THREE.CanvasTexture(diff);
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 5);
    t.anisotropy = 4;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  snowCache = { map, bumpMap };
  return snowCache;
}

function Snowfall({ count = 260 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (((i * 73) % 200) / 200 - 0.5) * 13,
        y: ((i * 37) % 100) / 100 * 9,
        z: (((i * 51) % 200) / 200 - 0.5) * 10 - 2,
        speed: 0.25 + ((i * 17) % 50) / 90,
        swayAmp: 0.15 + ((i * 29) % 30) / 90,
        swayFreq: 0.4 + ((i * 13) % 40) / 60,
        size: 0.012 + ((i * 19) % 22) / 900,
      })),
    [count]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    flakes.forEach((f, i) => {
      const y = 8.5 - ((f.y + t * f.speed) % 9);
      const x = f.x + Math.sin(t * f.swayFreq + i) * f.swayAmp;
      dummy.position.set(x, y - 0.6, f.z);
      dummy.scale.setScalar(f.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}

/** Smooth-shaded mountain: rock body fading into a broad snow mantle. */
function Mountain({ position, scale, hue }: { position: [number, number, number]; scale: number; hue: string }) {
  return (
    <group position={position}>
      <mesh scale={[scale, scale * 1.25, scale]}>
        <coneGeometry args={[1.5, 2.6, 28]} />
        <meshStandardMaterial color={hue} roughness={0.95} />
      </mesh>
      {/* Snow mantle wrapping the peak */}
      <mesh position={[0, scale * 0.95, 0]} scale={[scale * 0.75, scale * 0.8, scale * 0.75]}>
        <coneGeometry args={[1.0, 1.5, 28]} />
        <meshStandardMaterial color="#eef4fd" roughness={0.8} />
      </mesh>
      {/* Snow skirts on the flanks */}
      <mesh position={[scale * 0.45, scale * 0.3, scale * 0.2]} rotation={[0.1, 0, -0.35]} scale={[scale * 0.28, scale * 0.9, scale * 0.28]}>
        <coneGeometry args={[0.8, 1.6, 20]} />
        <meshStandardMaterial color="#dde8f6" roughness={0.85} />
      </mesh>
      <mesh position={[-scale * 0.4, scale * 0.22, scale * 0.15]} rotation={[0.05, 0, 0.3]} scale={[scale * 0.24, scale * 0.8, scale * 0.24]}>
        <coneGeometry args={[0.8, 1.6, 20]} />
        <meshStandardMaterial color="#d4e2f2" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pine({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 0.32, 10]} />
        <meshStandardMaterial color="#3d2e22" roughness={1} />
      </mesh>
      {[0.4, 0.68, 0.94].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]}>
            <coneGeometry args={[0.44 - i * 0.11, 0.44, 18]} />
            <meshStandardMaterial color="#1c463f" roughness={0.92} />
          </mesh>
          <mesh position={[0, y + 0.1, 0]}>
            <coneGeometry args={[0.32 - i * 0.085, 0.17, 18]} />
            <meshStandardMaterial color="#e9f1fb" roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SnowGround() {
  const snow = makeSnowMaps();
  return (
    <group>
      {/* Main snow field with texture + crystal glints */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.67, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial map={snow.map} bumpMap={snow.bumpMap} bumpScale={3} roughness={0.75} metalness={0.06} />
      </mesh>
      {/* Icy sheen ring around the pet's spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]}>
        <circleGeometry args={[1.6, 48]} />
        <meshStandardMaterial color="#f4f9ff" roughness={0.28} metalness={0.22} transparent opacity={0.55} />
      </mesh>
      {/* Rolling drifts — smooth shaded, textured */}
      {[
        [-2.6, -1.4, 0.55], [2.9, -2.2, 0.7], [-3.8, -3.6, 0.85],
        [4.1, -4.2, 0.95], [1.8, -1.1, 0.4], [-1.5, -2.8, 0.55],
        [-4.8, -1.8, 0.75], [5.2, -2.6, 0.7],
      ].map(([x, z, s], i) => (
        <mesh key={i} position={[x, -0.74 + s * 0.18, z]} scale={[s * 1.9, s * 0.5, s * 1.15]}>
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial map={snow.map} bumpMap={snow.bumpMap} bumpScale={2.2} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function WinterScene() {
  return (
    <group>
      <SnowGround />
      <Snowfall />

      {/* Mountain range — far backdrop, low enough to leave sky for the aurora */}
      <Mountain position={[-5.5, -0.7, -10]} scale={1.3} hue="#46618f" />
      <Mountain position={[-2.4, -0.7, -12]} scale={1.7} hue="#3b5583" />
      <Mountain position={[2.6, -0.7, -11.5]} scale={1.5} hue="#425c8a" />
      <Mountain position={[6.2, -0.7, -9.5]} scale={1.15} hue="#4a6694" />
      <Mountain position={[0.2, -0.7, -14]} scale={2.1} hue="#334d79" />

      {/* Snow-dusted pines framing the stage */}
      <Pine position={[-2.6, -0.7, -3.2]} scale={0.85} />
      <Pine position={[-3.9, -0.7, -5.2]} scale={1.15} />
      <Pine position={[2.9, -0.7, -3.6]} scale={0.95} />
      <Pine position={[4.2, -0.7, -5.8]} scale={1.25} />
      <Pine position={[-1.9, -0.7, -6.5]} scale={1.0} />
      <Pine position={[1.8, -0.7, -7.2]} scale={0.9} />

      {/* Cool moonlight from behind + warm-cold contrast */}
      <directionalLight position={[-4, 5, -6]} intensity={0.55} color="#9fc4ff" />
      <directionalLight position={[5, 3, -4]} intensity={0.2} color="#ffd9b0" />
      <fog attach="fog" args={['#263b60', 8, 19]} />
    </group>
  );
}
