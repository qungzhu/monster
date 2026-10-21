import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { WinterScene } from '../components/world/WinterScene';
import { PlushLighting } from '../components/pets/PetScene';
import { PlazaCat, ARENA_Z_OFFSET, GROUND_Y } from '../plaza/PlazaCat';
import type { CatPose } from '../plaza/PlazaCat';
import { usePlaza } from '../plaza/usePlaza';
import type { RemoteTarget } from '../plaza/usePlaza';
import { ARENA_RADIUS, INTERACT_LABEL, INTERACT_PROMPT_RADIUS, PLAZA_BREEDS, PLAZA_EMOTES, SEND_HZ, interactionPose, liteModelUrl } from '../plaza/protocol';
import type { Interaction, InteractKind, Peer, PlazaAction } from '../plaza/protocol';

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

/** Reports the nearest other cat within prompt range (throttled, change-only). */
function ProximityWatcher({ getSelf, selfId, targets, onNear }: {
  getSelf: () => CatPose | undefined;
  selfId: React.MutableRefObject<string | null>;
  targets: React.MutableRefObject<Map<string, RemoteTarget>>;
  onNear: (id: string | null) => void;
}) {
  const acc = useRef(0);
  const last = useRef<string | null>(null);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.2) return;
    acc.current = 0;
    const me = getSelf();
    let best: string | null = null;
    let bestD = INTERACT_PROMPT_RADIUS;
    if (me) {
      for (const [id, t] of targets.current) {
        if (id === selfId.current) continue;   // the map also holds my own cat
        const d = Math.hypot(t.x - me.x, t.z - me.z);
        if (d < bestD) { bestD = d; best = id; }
      }
    }
    if (best !== last.current) { last.current = best; onNear(best); }
  });
  return null;
}

/** Floating hearts / sparkles over a pair that is interacting — visible to everyone. */
function InteractionFx({ it }: { it: Interaction }) {
  const icons = it.kind === 'rub' ? ['💕', '💗', '💞'] : ['🎾', '✨', '⭐'];
  return (
    <Html position={[it.mx, GROUND_Y + 1.35, it.mz + ARENA_Z_OFFSET]} center zIndexRange={[20, 0]}>
      <div className="pointer-events-none flex gap-1 text-xl">
        {icons.map((ic, i) => (
          <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.18}s` }}>{ic}</span>
        ))}
      </div>
    </Html>
  );
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
  const {
    status, selfId, room, peers, targets, sendState,
    interactions, interactionsRef, invite, notice, setNotice, pendingInvite, sendInvite, sendReply,
  } = usePlaza(identity);
  const [near, setNear] = useState<string | null>(null);
  const selfIdRef = useRef<string | null>(null);
  useEffect(() => { selfIdRef.current = selfId; }, [selfId]);

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

  // The interaction (if any) my cat is currently part of.
  const myInteraction = useCallback((): { it: Interaction; role: 0 | 1; t: number } | null => {
    const me = selfIdRef.current;
    if (!me) return null;
    for (const it of interactionsRef.current) {
      const t = (performance.now() - it.start) / 1000;
      if (t > it.duration / 1000) continue;
      if (it.a === me) return { it, role: 0, t };
      if (it.b === me) return { it, role: 1, t };
    }
    return null;
  }, [interactionsRef]);

  const onGroundClick = useCallback((point: THREE.Vector3) => {
    if (myInteraction()) return; // busy dancing
    let x = point.x, z = point.z - ARENA_Z_OFFSET;
    const r = Math.hypot(x, z);
    if (r > ARENA_RADIUS) { x = (x / r) * ARENA_RADIUS; z = (z / r) * ARENA_RADIUS; }
    sim.current.tx = x;
    sim.current.tz = z;
  }, [myInteraction]);

  // Move the own cat toward the tapped point (walk near, run far).
  const stepSelf = useCallback((dt: number): CatPose | undefined => {
    const s = sim.current;
    if (!s.ready) return undefined;

    // Pair interaction: follow the shared choreography slot.
    const mine = myInteraction();
    if (mine) {
      const goal = interactionPose(mine.it, mine.role, mine.t);
      const gx = goal.x - s.x, gz = goal.z - s.z;
      const gd = Math.hypot(gx, gz);
      if (gd > 0.12) {                         // still getting into position
        const d = Math.min(gd, 3 * dt);
        s.x += (gx / gd) * d;
        s.z += (gz / gd) * d;
        s.ry = Math.atan2(gx, gz);
        s.action = gd > 0.5 ? 'Run' : 'Walk';
      } else {
        s.x = goal.x; s.z = goal.z; s.ry = goal.ry; s.action = goal.action;
      }
      s.tx = s.x; s.tz = s.z; s.emote = null;   // stay put when it ends
      return s;
    }

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
  }, [myInteraction]);

  const selfPose = useCallback(() => (sim.current.ready ? sim.current : undefined), []);
  const remotePose = (id: string) => (): RemoteTarget | undefined => targets.current.get(id);

  const others = peers.filter((p: Peer) => p.id !== selfId);
  const peerById = (id: string | null | undefined) => peers.find(p => p.id === id);
  const busy = interactions.some(it => it.a === selfId || it.b === selfId);
  const nearPeer = near ? peerById(near) : undefined;

  // Toasts fade on their own; an unanswered invite auto-declines.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice, setNotice]);
  useEffect(() => {
    if (!invite) return;
    const t = setTimeout(() => sendReply(invite.from, false), 14000);  // auto-decline just before the server TTL
    return () => clearTimeout(t);
  }, [invite, sendReply]);

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
          <ProximityWatcher getSelf={selfPose} selfId={selfIdRef} targets={targets} onNear={setNear} />
          {interactions.map(it => <InteractionFx key={`${it.a}-${it.b}-${it.start}`} it={it} />)}
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between p-3 text-xs text-white">
        <a href="/" className="pointer-events-auto rounded-full bg-slate-900/70 px-3 py-1.5">← 回家</a>
        <div className="rounded-full bg-slate-900/70 px-3 py-1.5">
          {status === 'online' && room ? `❄️ 雪原 ${room} 区 · 在线 ${peers.length}/20` : status === 'connecting' ? '连接中…' : '已断开，正在重连…'}
        </div>
      </div>

      {/* Proximity prompt: invite the cat next to you */}
      {identity && status === 'online' && nearPeer && !busy && (
        <div className="absolute bottom-16 left-1/2 w-[min(92%,340px)] -translate-x-1/2 rounded-2xl bg-slate-900/85 p-3 text-white shadow-xl ring-1 ring-pink-400/40 backdrop-blur">
          {pendingInvite?.to === nearPeer.id ? (
            <p className="text-center text-xs text-slate-200">已邀请 {nearPeer.petName} {INTERACT_LABEL[pendingInvite.kind]},等 TA 回应…</p>
          ) : (
            <>
              <p className="text-center text-xs text-slate-300">🐾 靠近了 <span className="text-white">{nearPeer.petName}</span> · {nearPeer.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['rub', 'play'] as InteractKind[]).map(kind => (
                  <button
                    key={kind}
                    onClick={() => sendInvite(nearPeer.id, kind)}
                    className="rounded-xl bg-pink-500/90 py-2 text-sm font-medium hover:bg-pink-400"
                  >
                    {kind === 'rub' ? '🤗 一起蹭蹭' : '🎾 一起玩'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Incoming invite */}
      {invite && (
        <div className="absolute left-1/2 top-16 z-30 w-[min(92%,340px)] -translate-x-1/2 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl">
          <p className="text-sm"><b>{invite.name}</b> 的 <b>{invite.petName}</b> 想和你{INTERACT_LABEL[invite.kind]} {invite.kind === 'rub' ? '🤗' : '🎾'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => sendReply(invite.from, true)} className="rounded-xl bg-pink-500 py-2 text-sm font-semibold text-white">好呀</button>
            <button onClick={() => sendReply(invite.from, false)} className="rounded-xl bg-slate-200 py-2 text-sm">下次吧</button>
          </div>
        </div>
      )}

      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-2 text-xs text-white">{notice}</div>
      )}

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
