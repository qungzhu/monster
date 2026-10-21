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
  | { t: 'error'; message: string };

/** Breeds that have a lightweight (LOD) model for the multiplayer plaza. */
export const PLAZA_BREEDS: { id: string; label: string; url: string }[] = [
  { id: 'meshy-tabby', label: '皮克斯鲍勃 · 斑斑', url: '/models/lite/pixiebob-rigged.glb' },
  { id: 'meshy-eurotabby', label: '欧短虎斑 · 麦茶', url: '/models/lite/mesh-tabby2.glb' },
  { id: 'meshy-norwegian', label: '挪威森林 · 松松', url: '/models/lite/mesh-norweg.glb' },
  { id: 'meshy-mainecoon', label: '缅因 · 狮狮', url: '/models/lite/mesh-mainecoon.glb' },
  { id: 'meshy-persian', label: '金吉拉波斯 · 布丁', url: '/models/lite/mesh-persian.glb' },
  { id: 'meshy-ragdoll', label: '布偶 · 雪球', url: '/models/lite/mesh-ragdoll.glb' },
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
