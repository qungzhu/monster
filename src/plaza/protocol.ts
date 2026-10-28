// Client side of the shared-plaza protocol (mirrors server/plazaRoom.js).

export const ARENA_RADIUS = 4;
export const SEND_HZ = 10;

export type PlazaAction = 'Idle' | 'Walk' | 'Run' | 'Scratch' | 'Eat' | 'Sleep' | 'Meow' | 'Happy';

export interface Peer {
  id: string;
  name: string;
  petName: string;
  breed: string;
  x: number;
  z: number;
  ry: number;
  action: PlazaAction;
}

export type ServerMessage =
  | { t: 'welcome'; id: string; peers: Peer[] }
  | { t: 'room'; number: number }
  | { t: 'joined'; peer: Peer }
  | { t: 'left'; id: string }
  | { t: 'states'; list: [string, number, number, number, PlazaAction][] }
  | { t: 'invited'; from: string; kind: InteractKind; name: string; petName: string }
  | { t: 'declined'; by: string; petName: string }
  | { t: 'interact'; a: string; b: string; kind: InteractKind; mx: number; mz: number; angle: number; duration: number }
  | { t: 'bonds'; list: Friend[] }
  | { t: 'bond'; with: string; petName: string; gained: number; total: number; level: number; levelUp: boolean; capped: boolean; todayLeft: number }
  | { t: 'error'; message: string };

/** Breeds that have a lightweight (LOD) model for the multiplayer plaza. */
export const PLAZA_BREEDS: { id: string; label: string; url: string }[] = [
  { id: 'meshy-tabby', label: '皮克斯鲍勃 · 斑斑', url: '/models/lite/pixiebob-rigged.glb' },
  { id: 'meshy-eurotabby', label: '欧短虎斑 · 麦茶', url: '/models/lite/mesh-tabby2.glb' },
  { id: 'meshy-norwegian', label: '挪威森林 · 松松', url: '/models/lite/mesh-norweg.glb' },
  { id: 'meshy-mainecoon', label: '缅因 · 狮狮', url: '/models/lite/mesh-mainecoon.glb' },
  { id: 'meshy-persian', label: '金吉拉波斯 · 布丁', url: '/models/lite/mesh-persian.glb' },
  { id: 'meshy-ragdoll', label: '布偶 · 雪球', url: '/models/lite/mesh-ragdoll.glb' },
  { id: 'plush-himalayan', label: '喜马拉雅 · 雪糕', url: '/models/lite/plush-himalayan.glb' },
  { id: 'plush-birman', label: '伯曼 · 手套', url: '/models/lite/plush-birman.glb' },
  { id: 'plush-angora', label: '土耳其安哥拉 · 云朵', url: '/models/lite/plush-angora.glb' },
];

export const liteModelUrl = (breed: string) =>
  (PLAZA_BREEDS.find(b => b.id === breed) ?? PLAZA_BREEDS[0]).url;

/** Emote buttons: the 8 skeletal clips every lite model carries. */
export const PLAZA_EMOTES: { action: PlazaAction; label: string }[] = [
  { action: 'Happy', label: '💕 撒娇' },
  { action: 'Meow', label: '🐱 喵' },
  { action: 'Scratch', label: '🐾 舔爪' },
  { action: 'Eat', label: '🍖 吃饭' },
  { action: 'Sleep', label: '💤 睡觉' },
];

export function plazaSocketUrl() {
  const fromEnv = import.meta.env.VITE_PLAZA_URL as string | undefined;
  if (fromEnv) return fromEnv;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/plaza-ws`;
}

// ———— Pair interactions: 一起蹭蹭 / 一起玩 ————

export type InteractKind = 'rub' | 'play';
export const INTERACT_PROMPT_RADIUS = 1.3;
export const INTERACT_LABEL: Record<InteractKind, string> = { rub: '一起蹭蹭', play: '一起玩' };

export interface Interaction {
  a: string;            // inviter
  b: string;            // invitee
  kind: InteractKind;
  mx: number;           // arena midpoint at accept time
  mz: number;
  angle: number;        // heading from a toward b
  duration: number;     // ms
  start: number;        // performance.now() when received
}

/**
 * Deterministic choreography: given the shared interaction and elapsed
 * seconds, where each participant should be. Both players compute their
 * own slot from the same inputs, then stream it like any other movement —
 * so everyone in the room sees the same dance with no extra sync.
 */
export function interactionPose(it: Interaction, role: 0 | 1, t: number) {
  const dur = it.duration / 1000;
  const dx = Math.sin(it.angle), dz = Math.cos(it.angle);
  if (it.kind === 'rub') {
    // Side by side, facing each other, swaying cheek to cheek.
    const side = role === 0 ? -1 : 1;
    const gap = 0.26;
    const sway = Math.sin(t * 4) * 0.35 * side;
    return {
      x: it.mx + dx * gap * side,
      z: it.mz + dz * gap * side,
      ry: it.angle + (role === 0 ? 0 : Math.PI) + sway,
      action: 'Happy' as PlazaAction,
    };
  }
  // play: chase each other round a small circle, then face in and cheer.
  const R = 0.7;
  const omega = 2.4;                       // ~1.7 u/s, under the server speed cap
  const runFor = Math.max(0, dur - 1);
  const phi = it.angle + Math.PI + role * Math.PI + omega * Math.min(t, runFor);
  const x = it.mx + Math.sin(phi) * R;
  const z = it.mz + Math.cos(phi) * R;
  if (t < runFor) return { x, z, ry: phi + Math.PI / 2, action: 'Run' as PlazaAction };
  return { x, z, ry: phi + Math.PI, action: 'Happy' as PlazaAction };
}

// ———— Friendship (好感) — mirrors server/plazaBonds.js ————

export const DAILY_PAIR_CAP = 20;

export const BOND_LEVELS = [
  { min: 0, name: '陌生猫猫', badge: '' },
  { min: 10, name: '点头之交', badge: '🤝' },
  { min: 30, name: '好朋友', badge: '💛' },
  { min: 60, name: '好闺蜜', badge: '💖' },
  { min: 100, name: '形影不离', badge: '💞' },
];

export interface Friend {
  name: string;
  petName: string;
  total: number;
  level: number;
  online: string | null;   // session id when in this room
}

export interface BondReward {
  petName: string;
  gained: number;
  total: number;
  level: number;
  levelUp: boolean;
  capped: boolean;
}

/** Next level threshold (or null at max) for a progress bar. */
export const nextLevelMin = (level: number) => BOND_LEVELS[level + 1]?.min ?? null;

/**
 * Private per-device identity so friendship survives reconnects. Only the
 * server sees it; other players only ever see session ids.
 */
export function plazaDeviceKey(): string {
  const K = 'fp-plaza-key';
  try {
    let key = localStorage.getItem(K);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(K, key);
    }
    return key;
  } catch {
    return crypto.randomUUID();   // storage blocked: friendship lasts this session
  }
}

/** What a bond reward is worth in the single-player app (XP, coins, intimacy). */
export const rewardGrowth = (r: BondReward) => ({ xp: r.gained * 2, coins: r.gained, intimacy: r.gained > 0 ? 1 : 0 });
