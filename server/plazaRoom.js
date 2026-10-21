// Shared-plaza room logic. Transport-agnostic on purpose: it only takes
// parsed messages and a `send(peerId, obj)` callback, so the same class can
// run inside the local Node WebSocket server (server/plaza.js) or, later,
// inside a Cloudflare Durable Object without changes.
//
// Protocol (JSON):
//   client -> server
//     { t: 'join',  name, petName, breed }
//     { t: 'state', x, z, ry, action }          // ~10 Hz, own cat only
//   server -> client
//     { t: 'welcome', id, peers: Peer[] }
//     { t: 'joined',  peer: Peer }
//     { t: 'left',    id }
//     { t: 'states',  list: [id, x, z, ry, action][] }   // batched, 10 Hz
//     { t: 'error',   message }

export const ARENA_RADIUS = 4;
export const ROOM_CAPACITY = 20;
export const TICK_MS = 100;
export const ACTIONS = ['Idle', 'Walk', 'Run', 'Scratch', 'Eat', 'Sleep', 'Meow', 'Happy'];
export const BREEDS = [
  'meshy-tabby', 'meshy-eurotabby', 'meshy-norwegian',
  'meshy-mainecoon', 'meshy-persian', 'meshy-ragdoll',
];

// Max distance a cat may cover per second. Running is ~2.6 u/s on the
// client; anything far beyond that is a teleport and gets clamped.
const MAX_SPEED = 4;
const MAX_MSGS_PER_SEC = 30;

const cleanText = (value, max) =>
  String(value ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export class PlazaRoom {
  constructor(send) {
    this.send = send;
    this.peers = new Map();
    this.dirty = new Set();
  }

  get size() {
    return this.peers.size;
  }

  get full() {
    return this.peers.size >= ROOM_CAPACITY;
  }

  publicPeer(p) {
    return { id: p.id, name: p.name, petName: p.petName, breed: p.breed, x: p.x, z: p.z, ry: p.ry, action: p.action };
  }

  broadcast(obj, exceptId) {
    for (const id of this.peers.keys()) if (id !== exceptId) this.send(id, obj);
  }

  join(id, msg) {
    const angle = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 1.5;
    const peer = {
      id,
      name: cleanText(msg.name, 16) || '游客',
      petName: cleanText(msg.petName, 12) || '小猫',
      breed: BREEDS.includes(msg.breed) ? msg.breed : BREEDS[0],
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      ry: 0,
      action: 'Idle',
      lastAt: Date.now(),
      window: { start: Date.now(), count: 0 },
    };
    this.peers.set(id, peer);
    this.send(id, { t: 'welcome', id, peers: [...this.peers.values()].map(p => this.publicPeer(p)) });
    this.broadcast({ t: 'joined', peer: this.publicPeer(peer) }, id);
  }

  leave(id) {
    if (!this.peers.delete(id)) return;
    this.dirty.delete(id);
    this.broadcast({ t: 'left', id });
  }

  // Returns false when the client should be disconnected (flooding).
  handle(id, msg) {
    const peer = this.peers.get(id);
    if (!peer) return true;

    const now = Date.now();
    if (now - peer.window.start > 1000) peer.window = { start: now, count: 0 };
    if (++peer.window.count > MAX_MSGS_PER_SEC) return false;

    if (msg.t !== 'state') return true;
    let x = Number(msg.x), z = Number(msg.z), ry = Number(msg.ry);
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(ry)) return true;

    // Anti-teleport: limit distance moved since the last accepted update.
    const dt = Math.max(0.05, (now - peer.lastAt) / 1000);
    const dx = x - peer.x, dz = z - peer.z;
    const dist = Math.hypot(dx, dz);
    const maxDist = MAX_SPEED * dt;
    if (dist > maxDist) {
      x = peer.x + (dx / dist) * maxDist;
      z = peer.z + (dz / dist) * maxDist;
    }
    // Keep everyone inside the plaza.
    const r = Math.hypot(x, z);
    if (r > ARENA_RADIUS) {
      x = (x / r) * ARENA_RADIUS;
      z = (z / r) * ARENA_RADIUS;
    }

    peer.x = x;
    peer.z = z;
    peer.ry = ry;
    peer.action = ACTIONS.includes(msg.action) ? msg.action : 'Idle';
    peer.lastAt = now;
    this.dirty.add(id);
    return true;
  }

  // Called every TICK_MS: one batched message instead of one per update.
  tick() {
    if (!this.dirty.size) return;
    const list = [];
    for (const id of this.dirty) {
      const p = this.peers.get(id);
      if (p) list.push([p.id, +p.x.toFixed(3), +p.z.toFixed(3), +p.ry.toFixed(3), p.action]);
    }
    this.dirty.clear();
    this.broadcast({ t: 'states', list });
  }
}
