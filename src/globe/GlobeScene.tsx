import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stars, useAnimations, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { toPlushMaterial } from '../components/pets/plushMaterial';
import { liteModelUrl } from '../plaza/protocol';
import { EARTH_RADIUS, latLonToVec3 } from './geo';
import type { HeatCell } from './geo';
import { makeEarthTexture } from './earth';
import type { GlobePet } from './presence';

const PET_HEIGHT = 0.055;   // a cat stands this tall on the unit globe

/** The plush globe: pastel map, soft fabric lighting, a blue halo. */
function Earth() {
  const gl = useThree(s => s.gl);
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    makeEarthTexture(gl.capabilities.getMaxAnisotropy()).then(t => { if (alive) setMap(t); });
    return () => { alive = false; };
  }, [gl]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 128, 64]} />
        {/* lit softly and mostly by its own colours, so the pastel map
            doesn't wash out under the lights the cats need */}
        <meshLambertMaterial key={map ? "map" : "plain"} map={map} color={map ? '#ffffff' : '#9fd6ef'} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.45} />
      </mesh>
      <Atmosphere />
    </group>
  );
}

/** Blue glow around the rim (fresnel on an inside-out shell). */
function Atmosphere() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color('#5fc8ff') } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() { float f = pow(clamp(1.0 + dot(vN, vV) * 1.0, 0.0, 1.0), 3.0); gl_FragColor = vec4(uColor, f * 0.9); }`,
  }), []);
  return (
    <mesh material={mat} scale={1.13}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 32]} />
    </mesh>
  );
}

/** Where people are online: soft blobs on a transparent shell, coloured
 *  blue -> green -> yellow -> red by how many are there. */
function HeatLayer({ cells, visible }: { cells: HeatCell[]; visible: boolean }) {
  const texture = useMemo(() => {
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const max = Math.max(4, ...cells.map(c => c.count));
    for (const c of cells) {
      const x = ((c.lon + 180) / 360) * W, y = ((90 - c.lat) / 180) * H;
      const r = 9 + 14 * Math.sqrt(c.count / max);
      const a = 0.12 + 0.5 * (c.count / max);
      for (const dx of [-W, 0, W]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        // widen toward the poles so blobs stay round on the sphere
        ctx.save();
        ctx.translate(x + dx, y);
        ctx.scale(1 / Math.max(0.3, Math.cos((c.lat * Math.PI) / 180)), 1);
        ctx.translate(-(x + dx), -y);
        ctx.fillRect(x + dx - r, y - r, 2 * r, 2 * r);
        ctx.restore();
      }
    }
    // alpha (how crowded) -> colour ramp
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const ramp: [number, number, number, number][] = [
      [0.0, 60, 140, 255], [0.25, 40, 200, 230], [0.45, 90, 220, 120], [0.65, 250, 225, 60], [0.82, 255, 120, 40], [1.0, 200, 20, 30],
    ];
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.min(1, d[i + 3] / 255);
      if (v <= 0.01) { d[i + 3] = 0; continue; }
      let k = 1;
      while (k < ramp.length - 1 && ramp[k][0] < v) k++;
      const [t0, r0, g0, b0] = ramp[k - 1], [t1, r1, g1, b1] = ramp[k];
      const f = Math.min(1, Math.max(0, (v - t0) / (t1 - t0)));
      d[i] = r0 + (r1 - r0) * f; d[i + 1] = g0 + (g1 - g0) * f; d[i + 2] = b0 + (b1 - b0) * f;
      d[i + 3] = Math.min(255, 70 + 185 * v);
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [cells]);
  useEffect(() => () => texture.dispose(), [texture]);
  // close in, the crowd colours would bury the map and the cats: fade them
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ camera }) => {
    if (mat.current) mat.current.opacity = THREE.MathUtils.clamp((camera.position.length() - 1.25) / 1.6, 0.22, 0.72);
  });
  return (
    <mesh visible={visible} renderOrder={1}>
      <sphereGeometry args={[EARTH_RADIUS * 1.003, 96, 48]} />
      <meshBasicMaterial ref={mat} map={texture} transparent opacity={0.72} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}


/** One cat standing on the globe where its owner is, with a name tag. */
function GlobeCat({ pet, isSelf, selected, showLabel, onSelect }: {
  pet: Pick<GlobePet, 'id' | 'breed' | 'lat' | 'lon' | 'name' | 'petName' | 'lastSeen' | 'action' | 'friend'>;
  isSelf?: boolean;
  selected: boolean;
  showLabel: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const anim = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const { scene, animations } = useGLTF(liteModelUrl(pet.breed));
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = toPlushMaterial(m.material as THREE.MeshStandardMaterial, m);
        m.frustumCulled = false;
      }
    });
    return c;
  }, [scene]);
  // stand the cat on the sphere at its spot, feet down, scaled to size
  // (measured with skinning applied, like PlazaCat: the bind-pose box of a
  // skinned lite model is far off)
  const fit = useMemo(() => {
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    clone.traverse(o => {
      const sk = o as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh) return;
      sk.skeleton.update();
      const pos = sk.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += step) box.expandByPoint(sk.getVertexPosition(i, v).applyMatrix4(sk.matrixWorld));
    });
    if (box.isEmpty()) box.setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const s = PET_HEIGHT / Math.max(size.y, 1e-4);
    return { s, x: -c.x * s, y: -box.min.y * s, z: -c.z * s };
  }, [clone]);
  const position = useMemo(() => latLonToVec3(pet.lat, pet.lon, EARTH_RADIUS), [pet.lat, pet.lon]);

  const { actions } = useAnimations(animations, anim);
  useEffect(() => {
    const name = pet.lastSeen > 0 ? 'Sleep' : pet.action;
    const a = actions[name] ?? actions.Idle;
    a?.reset().fadeIn(0.3).play();
    return () => { a?.fadeOut(0.3); };
  }, [actions, pet.action, pet.lastSeen]);

  // Seen from above a cat is just a furry back: stand it up toward the
  // viewer (its up leans from the ground's normal to the screen's up) and
  // turn it to face the camera, like a little figure on the globe.
  // Cats (and their tags) on the far side of the globe are hidden.
  const tmp = useMemo(() => ({ n: new THREE.Vector3(), up: new THREE.Vector3(), fwd: new THREE.Vector3(), x: new THREE.Vector3(), m: new THREE.Matrix4(), camUp: new THREE.Vector3() }), []);
  useFrame(({ camera }) => {
    if (!group.current) return;
    const { n, up, fwd, x, m, camUp } = tmp;
    n.copy(position).normalize();
    const facing = n.dot(camera.position.clone().normalize());
    camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    up.copy(n).lerp(camUp, 0.75).normalize();
    fwd.copy(camera.position).sub(position);
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    x.crossVectors(up, fwd).normalize();
    m.makeBasis(x, up, fwd);
    group.current.quaternion.setFromRotationMatrix(m);
    const show = facing > 0.12;
    group.current.visible = show;
    if (label.current) label.current.style.opacity = show && showLabel ? String(Math.min(1, (facing - 0.12) * 5)) : '0';
  });

  const online = pet.lastSeen === 0;
  return (
    <group ref={group} position={position}>
      {/* three-quarter view, each cat turned a little its own way */}
      <group rotation={[0, 0.5 + ((pet.id.length * 1.7) % 1) - 0.5, 0]}>
        <group ref={anim} scale={fit.s} position={[fit.x, fit.y, fit.z]}>
          <primitive object={clone} />
        </group>
      </group>
      {/* bigger invisible hit area: a cat is tiny when zoomed out */}
      <mesh position={[0, PET_HEIGHT * 0.5, 0]} onClick={e => { e.stopPropagation(); onSelect(); }} visible={false}>
        <sphereGeometry args={[PET_HEIGHT * 0.9, 8, 8]} />
      </mesh>
      {(selected || isSelf) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[PET_HEIGHT * 0.55, PET_HEIGHT * 0.75, 32]} />
          <meshBasicMaterial color={isSelf ? '#f0566a' : '#ffffff'} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
      <Html position={[0, PET_HEIGHT * 1.25, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={label} style={{ opacity: 0, transition: 'opacity 0.2s' }}
          className="whitespace-nowrap rounded-lg bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-800 shadow-md">
          {isSelf ? '我 · ' : ''}{pet.petName}
          {pet.friend && !isSelf && <span className="ml-1 text-[#f0566a]">♥</span>}
          <span className={`ml-1 text-[10px] font-medium ${online ? 'text-emerald-500' : 'text-slate-400'}`}>
            {online ? '在线' : `${pet.lastSeen}分钟前`}
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Camera: free orbit with damping; flies to a spot when asked. */
function CameraRig({ focus }: { focus: { lat: number; lon: number; n: number } | null }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree(s => s.camera);
  const fly = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const size = useThree(s => s.size);
  // whole globe (with its halo) fits the screen's narrow side
  const fitDist = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const v = THREE.MathUtils.degToRad(cam.fov) / 2;
    const h = Math.atan(Math.tan(v) * (size.width / size.height));
    return 1.1 / Math.sin(Math.min(v, h));
  }, [camera, size.width, size.height]);
  // open facing East Asia, where most players are
  useEffect(() => {
    latLonToVec3(28, 110, fitDist, camera.position);
    camera.lookAt(0, 0, 0);
  }, [camera, fitDist]);
  useEffect(() => {
    if (!focus) return;
    const dist = Math.min(camera.position.length(), 1.9);
    fly.current = { from: camera.position.clone(), to: latLonToVec3(focus.lat, focus.lon, dist), t: 0 };
  }, [focus, camera]);
  useFrame((_, dt) => {
    const f = fly.current;
    const c = controls.current;
    if (c) {
      // slower turning when close in, so a swipe doesn't fling the globe
      const d = camera.position.length();
      c.rotateSpeed = 0.25 + 0.35 * Math.min(1, (d - 1.2) / 2);
    }
    if (!f) return;
    f.t = Math.min(1, f.t + dt / 1.1);
    const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
    // along the sphere, not through it
    const len = THREE.MathUtils.lerp(f.from.length(), f.to.length(), e);
    camera.position.copy(f.from.clone().normalize().lerp(f.to.clone().normalize(), e).normalize().multiplyScalar(len));
    camera.lookAt(0, 0, 0);
    c?.update();
    if (f.t >= 1) fly.current = null;
  });
  return (
    <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.08}
      minDistance={1.22} maxDistance={Math.max(4.2, fitDist * 1.1)} zoomSpeed={0.7} />
  );
}

export interface GlobeSceneProps {
  pets: GlobePet[];
  me: (Pick<GlobePet, 'id' | 'breed' | 'lat' | 'lon' | 'name' | 'petName' | 'lastSeen' | 'action' | 'friend'>) | null;
  heat: HeatCell[];
  showHeat: boolean;
  selectedId: string | null;
  focus: { lat: number; lon: number; n: number } | null;
  onSelect: (id: string | null) => void;
}

export function GlobeScene({ pets, me, heat, showHeat, selectedId, focus, onSelect }: GlobeSceneProps) {
  const camera = useThree(s => s.camera);
  const [zoomedIn, setZoomedIn] = useState(false);
  useFrame(() => {
    const z = camera.position.length() < 2.2;
    if (z !== zoomedIn) setZoomedIn(z);
  });
  return (
    <>
      <color attach="background" args={['#070b1d']} />
      <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
      <hemisphereLight args={['#ffffff', '#9cb6d8', 0.75]} />
      <directionalLight position={[3, 2, 4]} intensity={0.9} />
      <directionalLight position={[-3, -1, -2]} intensity={0.3} color="#bcd7ff" />
      <group>
        <Earth />
        <HeatLayer cells={heat} visible={showHeat} />
        <Suspense fallback={null}>
          {pets.map(p => (
            <GlobeCat key={p.id} pet={p} selected={selectedId === p.id}
              showLabel={zoomedIn || p.friend || selectedId === p.id}
              onSelect={() => onSelect(p.id)} />
          ))}
          {me && <GlobeCat key="me" pet={me} isSelf selected={selectedId === 'me'} showLabel onSelect={() => onSelect('me')} />}
        </Suspense>
      </group>
      <CameraRig focus={focus} />
    </>
  );
}
