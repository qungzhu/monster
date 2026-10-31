import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Group } from 'three';
import { PetModel, PlushLighting } from '../components/pets/PetScene';
import { WinterScene } from '../components/world/WinterScene';
import type { Breed } from '../data/breeds';

/**
 * Off-screen renders of the pet for the iOS lock screen, stepped frame by
 * frame (not in real time) so every frame is complete and evenly spaced:
 *  - 'live': a portrait Live Photo of the pet in its winter world, framed
 *    to stand below the lock-screen clock;
 *  - 'widget': one square picture of the pet alone, transparent background.
 */
export interface PetVisual {
  characterId: string;
  breedId: string | null;
  customBreed: Breed | null;
}

interface CaptureProps {
  pet: PetVisual;
  mode: 'live' | 'widget';
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  /** Called with each finished frame, in order; awaited before the next one. */
  onFrame: (canvas: HTMLCanvasElement, index: number) => Promise<void>;
  onDone: () => void;
  onError: (error: unknown) => void;
}

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

/** Waits until the models and textures have loaded (or 30 s pass). */
async function settle() {
  const start = performance.now();
  let quietSince = performance.now();
  while (performance.now() - start < 30000) {
    await nextFrame();
    if (useProgress.getState().active) quietSince = performance.now();
    else if (performance.now() - quietSince > 600) return;
  }
}

function Stepper({ fps, frameCount, onFrame, onDone, onError, sway }: Omit<CaptureProps, 'pet' | 'mode' | 'width' | 'height'> & { sway: RefObject<Group | null> }) {
  const { gl, advance } = useThree();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        // Warm up: let suspended models mount, shaders compile, the
        // environment map bake and skeletal clips get going. Time only
        // moves forward, one frame at a time.
        let tick = 0;
        const step = () => advance(++tick / fps);
        for (let i = 0; i < 4; i++) { step(); await nextFrame(); }
        await settle();
        for (let i = 0; i < 2 * fps; i++) { step(); if (i % 6 === 0) await nextFrame(); }
        for (let i = 0; i < frameCount; i++) {
          if (sway.current) {
            // A slow look to one side and back, so even unrigged pets move.
            const p = i / Math.max(1, frameCount - 1);
            sway.current.rotation.y = Math.sin(p * Math.PI * 2) * 0.22;
          }
          step();
          await onFrame(gl.domElement, i);
        }
        onDone();
      } catch (e) {
        onError(e);
      }
    })();
  }, [advance, fps, frameCount, gl, onDone, onError, onFrame, sway]);
  return null;
}

function useSkyTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0b1530');
    grad.addColorStop(0.45, '#1d3463');
    grad.addColorStop(0.8, '#5d7fb3');
    grad.addColorStop(1, '#a9c4e6');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function LiveSet() {
  const sky = useSkyTexture();
  return (
    <>
      <primitive attach="background" object={sky} />
      <WinterScene />
      <ContactShadows position={[0, -0.65, 0]} opacity={0.35} scale={3.5} blur={2.2} far={1.2} color="#2a4a7a" />
    </>
  );
}

function Aim({ target }: { target: [number, number, number] }) {
  const camera = useThree(s => s.camera);
  useEffect(() => { camera.lookAt(...target); camera.updateProjectionMatrix(); }, [camera, target]);
  return null;
}

const LIVE_TARGET: [number, number, number] = [0, 0.85, 0];
const WIDGET_TARGET: [number, number, number] = [0, 0, 0];

export function LockScreenCapture({ pet, mode, width, height, ...step }: CaptureProps) {
  const sway = useRef<Group>(null);
  const live = mode === 'live';
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', left: -20000, top: 0, width, height, pointerEvents: 'none' }}
    >
      <Canvas
        frameloop="never"
        dpr={1}
        camera={live ? { position: [0, 1.45, 5.0], fov: 50 } : { position: [0, 0.15, 3.15], fov: 34 }}
        gl={{ alpha: !live, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
        style={{ width, height, background: 'transparent' }}
        shadows
      >
        <Aim target={live ? LIVE_TARGET : WIDGET_TARGET} />
        <Suspense fallback={null}>
          <PlushLighting color="#cfe6ff" />
          <group ref={sway}>
            <PetModel characterId={pet.characterId} breedId={pet.breedId} customBreed={pet.customBreed} isHovered={false} />
          </group>
          {live && <LiveSet />}
          {live && (
            <EffectComposer>
              <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.4} intensity={0.6} mipmapBlur />
              <Vignette eskil={false} offset={0.1} darkness={0.35} />
            </EffectComposer>
          )}
          <Stepper {...step} sway={sway} />
        </Suspense>
      </Canvas>
    </div>
  );
}
