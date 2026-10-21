import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WinterScene } from '../components/world/WinterScene';
import { PlushLighting } from '../components/pets/PetScene';
import { PlazaCat, ARENA_Z_OFFSET, GROUND_Y } from '../plaza/PlazaCat';
import type { CatPose } from '../plaza/PlazaCat';
import { usePlaza } from '../plaza/usePlaza';
import type { RemoteTarget } from '../plaza/usePlaza';
import { ARENA_RADIUS, PLAZA_BREEDS, PLAZA_EMOTES, SEND_HZ, liteModelUrl } from '../plaza/protocol';
import type { Peer, PlazaAction } from '../plaza/protocol';

const WALK_SPEED = 1.3;
const RUN_SPEED = 2.6;
const RUN_DISTANCE = 2.5;

interface SelfSim extends CatPose {
  tx: number;
  tz: number;
  emote: PlazaAction | null;
  ready: boolean;
}

/** Drives the player's own cat each frame and streams its pose at SEND_HZ. */
function SelfController({ step, send }: {
  step: (dt: number) => CatPose | undefined;
  send: (x: number, z: number, ry: number, a: PlazaAction) => void;
}) {
  const acc = useRef(0);
  const look = useRef(new THREE.Vector3(0, -0.3, ARENA_Z_OFFSET));
  useFrame(({ camera }, dt) => {
    const pose = step(dt);
    if (!pose) return;

    // Follow camera: phones are portrait, so a fixed wide shot crops cats at
    // the plaza edge. Trail behind-above the own cat, smoothed.
    const k = 1 - Math.exp(-3 * dt);
    const cx = pose.x, cz = pose.z + ARENA_Z_OFFSET;
    camera.position.x += (cx * 0.85 - camera.position.x) * k;
    camera.position.y += (4.2 - camera.position.y) * k;
    camera.position.z += (cz + 7 - camera.position.z) * k;
    look.current.x += (cx - look.current.x) * k;
    look.current.z += (cz - look.current.z) * k;
    camera.lookAt(look.current.x, GROUND_Y + 0.5, look.current.z);

    acc.current += dt;
    if (acc.current >= 1 / SEND_HZ) {
      acc.current = 0;
      send(pose.x, pose.z, pose.ry, pose.action);
    }
  });
  return null;
}

function JoinScreen({ defaultName, defaultBreed, onJoin }: {
  defaultName: string;
  defaultBreed: string;
  onJoin: (name: string, breed: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [breed, setBreed] = useState(defaultBreed);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900/95 p-5 text-white shadow-2xl">
        <h2 className="text-lg font-semibold">❄️ 雪原广场</h2>
        <p className="mt-1 text-xs text-slate-300">和其他人的猫咪一起在雪地里玩。点雪地走过去，点远处会跑起来。</p>
        <label className="mt-4 block text-xs text-slate-300">你的名字</label>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, 16))}
          placeholder="起个名字"
          className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-pink-400"
        />
        <label className="mt-4 block text-xs text-slate-300">带哪只猫去</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {PLAZA_BREEDS.map(b => (
            <button
              key={b.id}
              onClick={() => setBreed(b.id)}
              className={`rounded-lg px-2 py-2 text-left text-xs ring-1 transition ${breed === b.id ? 'bg-pink-500/20 ring-pink-400' : 'bg-slate-800 ring-slate-700'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onJoin(name.trim() || '游客', breed)}
          className="mt-5 w-full rounded-xl bg-pink-500 py-2.5 text-sm font-semibold hover:bg-pink-400"
        >
          进入广场
        </button>
      </div>
    </div>
  );
}

interface PlazaProps {
  userName: string;
  adoptedBreedId: string | null;
}

export function Plaza({ userName, adoptedBreedId }: PlazaProps) {
  const [identity, setIdentity] = useState<{ name: string; petName: string; breed: string } | null>(null);
  const { status, selfId, room, peers, targets, sendState } = usePlaza(identity);

  const sim = useRef<SelfSim>({ x: 0, z: 0, ry: 0, action: 'Idle', tx: 0, tz: 0, emote: null, ready: false });
  const self = peers.find(p => p.id === selfId);
  // Seed the local sim from the server-assigned spawn point on each (re)join.
  useEffect(() => {
    const s = sim.current;
    if (!self) { s.ready = false; return; }
    if (!s.ready) Object.assign(s, { x: self.x, z: self.z, tx: self.x, tz: self.z, ry: self.ry, ready: true });
  }, [self]);

  const defaultBreed = PLAZA_BREEDS.some(b => b.id === adoptedBreedId) ? adoptedBreedId! : PLAZA_BREEDS[0].id;
  const onJoin = useCallback((name: string, breed: string) => {
    const petName = (PLAZA_BREEDS.find(b => b.id === breed)?.label.split('·')[1] ?? '小猫').trim();
    setIdentity({ name, petName, breed });
  }, []);

  const onGroundClick = useCallback((point: THREE.Vector3) => {
    let x = point.x, z = point.z - ARENA_Z_OFFSET;
    const r = Math.hypot(x, z);
    if (r > ARENA_RADIUS) { x = (x / r) * ARENA_RADIUS; z = (z / r) * ARENA_RADIUS; }
    sim.current.tx = x;
    sim.current.tz = z;
  }, []);

  // Move the own cat toward the tapped point (walk near, run far).
  const stepSelf = useCallback((dt: number): CatPose | undefined => {
    const s = sim.current;
    if (!s.ready) return undefined;
    const dx = s.tx - s.x, dz = s.tz - s.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const run = dist > RUN_DISTANCE;
      const d = Math.min(dist, (run ? RUN_SPEED : WALK_SPEED) * dt);
      s.x += (dx / dist) * d;
      s.z += (dz / dist) * d;
      s.ry = Math.atan2(dx, dz);
      s.action = run ? 'Run' : 'Walk';
      s.emote = null;
    } else {
      s.action = s.emote ?? 'Idle';
    }
    return s;
  }, []);

  const selfPose = useCallback(() => (sim.current.ready ? sim.current : undefined), []);
  const remotePose = (id: string) => (): RemoteTarget | undefined => targets.current.get(id);

  const others = peers.filter((p: Peer) => p.id !== selfId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1530]">
      <Canvas
        shadows
        camera={{ position: [0, 4.2, 9.5], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.3, ARENA_Z_OFFSET)}
      >
        <Suspense fallback={null}>
          <PlushLighting color="#7c3aed" />
          <WinterScene />
          <ContactShadows position={[0, GROUND_Y + 0.01, ARENA_Z_OFFSET]} opacity={0.35} scale={10} blur={2.2} far={1.5} color="#2a4a7a" />

          {/* tap target: the snow clearing */}
          <mesh
            rotation-x={-Math.PI / 2}
            position={[0, GROUND_Y + 0.02, ARENA_Z_OFFSET]}
            onClick={e => { e.stopPropagation(); onGroundClick(e.point); }}
          >
            <circleGeometry args={[ARENA_RADIUS + 0.5, 48]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {self && identity && (
            <PlazaCat key={self.id} url={liteModelUrl(self.breed)} getPose={selfPose} name={self.name} petName={self.petName} isSelf />
          )}
          {others.map(p => (
            <PlazaCat key={p.id} url={liteModelUrl(p.breed)} getPose={remotePose(p.id)} name={p.name} petName={p.petName} />
          ))}
          <SelfController step={stepSelf} send={sendState} />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between p-3 text-xs text-white">
        <a href="/" className="pointer-events-auto rounded-full bg-slate-900/70 px-3 py-1.5">← 回家</a>
        <div className="rounded-full bg-slate-900/70 px-3 py-1.5">
          {status === 'online' && room ? `❄️ 雪原 ${room} 区 · 在线 ${peers.length}/20` : status === 'connecting' ? '连接中…' : '已断开，正在重连…'}
        </div>
      </div>

      {identity && status === 'online' && (
        <div className="absolute bottom-4 left-0 right-0 flex flex-wrap justify-center gap-2 px-3">
          {PLAZA_EMOTES.map(e => (
            <button
              key={e.action}
              onClick={() => { const s = sim.current; s.tx = s.x; s.tz = s.z; s.emote = e.action; }}
              className="rounded-full bg-slate-900/75 px-3 py-1.5 text-xs text-white ring-1 ring-white/10 hover:bg-slate-800"
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {!identity && <JoinScreen defaultName={userName} defaultBreed={defaultBreed} onJoin={onJoin} />}
    </div>
  );
}
