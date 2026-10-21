// Shared-plaza room logic. Transport-agnostic on purpose: it only takes
// parsed messages and a `send(peerId, obj)` callback, so the same class can
// run inside the local Node WebSocket server (server/plaza.js) or, later,
// inside a Cloudflare Durable Object without changes.
//
// Protocol (JSON):
//   client -> server
//     { t: 'join',  name, petName, breed }
//     { t: 'state', x, z, ry, action }          // ~10 Hz, own cat only
//     { t: 'invite', to, kind }                  // kind: 'rub' | 'play'
//     { t: 'reply',  from, accept }
//   server -> client
//     { t: 'welcome', id, peers: Peer[] }
//     { t: 'joined',  peer: Peer }
//     { t: 'left',    id }
//     { t: 'states',  list: [id, x, z, ry, action][] }   // batched, 10 Hz
//     { t: 'invited',  from, kind, name, petName }
//     { t: 'declined', by, petName }
//     { t: 'interact', a, b, kind, mx, mz, angle, duration }  // to whole room
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

// Pair interactions ("一起蹭蹭 / 一起玩").
export const INTERACTIONS = { rub: 4500, play: 6000 };   // duration ms
const INTERACT_DISTANCE = 1.6;   // a bit more than the client's 1.3 prompt radius
export const INVITE_TTL = 15000;   // long enough for a real person to read and tap

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
      busyUntil: 0,
      invites: new Map(),   // fromId -> { kind, at }
      lastInviteAt: 0,
      lastAt: Date.now(),
      window: { start: Date.now(), count: 0 },
    };
    this.peers.set(id, peer);
    this.send(id, { t: 'welcome', id, peers: [...this.peers.values()].map(p => this.publicPeer(p)) });
    this.broadcast({ t: 'joined', peer: this.publicPeer(peer) }, id);
  }

  leave(id) {
    if (!this.peers.delete(id)) return;
    for (const p of this.peers.values()) p.invites.delete(id);
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

    if (msg.t === 'invite') { this.invite(peer, msg); return true; }
    if (msg.t === 'reply') { this.reply(peer, msg); return true; }
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

  isBusy(p, now = Date.now()) {
    return p.busyUntil > now;
  }

  invite(from, msg) {
    const now = Date.now();
    const to = this.peers.get(String(msg.to));
    const kind = msg.kind;
    if (!to || to.id === from.id || !(kind in INTERACTIONS)) return;
    if (now - from.lastInviteAt < 1500) return;              // no invite spam
    if (this.isBusy(from, now) || this.isBusy(to, now)) return;
    if (Math.hypot(to.x - from.x, to.z - from.z) > INTERACT_DISTANCE) return;
    from.lastInviteAt = now;
    to.invites.set(from.id, { kind, at: now });
    this.send(to.id, { t: 'invited', from: from.id, kind, name: from.name, petName: from.petName });
  }

  reply(to, msg) {
    const now = Date.now();
    const from = this.peers.get(String(msg.from));
    const inv = to.invites.get(String(msg.from));
    to.invites.delete(String(msg.from));
    // Never fail silently: tell both sides why nothing happened.
    if (!from || !inv) {
      this.send(to.id, { t: 'error', message: '这个邀请已经失效了' });
      return;
    }
    if (now - inv.at > INVITE_TTL) {
      this.send(to.id, { t: 'error', message: '邀请已过期,让 TA 再邀请一次吧' });
      this.send(from.id, { t: 'error', message: `${to.petName} 没来得及回应,再邀请一次吧` });
      return;
    }
    if (!msg.accept) {
      this.send(from.id, { t: 'declined', by: to.id, petName: to.petName });
      return;
    }
    // Re-check at accept time: both still free and still close.
    if (this.isBusy(from, now) || this.isBusy(to, now)) {
      this.send(to.id, { t: 'error', message: `${from.petName} 正在和别人玩,等一会儿吧` });
      return;
    }
    if (Math.hypot(to.x - from.x, to.z - from.z) > INTERACT_DISTANCE) {
      this.send(to.id, { t: 'error', message: `离 ${from.petName} 太远了,走近一点再玩吧` });
      this.send(from.id, { t: 'error', message: `${to.petName} 走远了,靠近一点再邀请吧` });
      return;
    }
    const duration = INTERACTIONS[inv.kind];
    from.busyUntil = to.busyUntil = now + duration;
    this.broadcast({
      t: 'interact',
      a: from.id,
      b: to.id,
      kind: inv.kind,
      mx: +((from.x + to.x) / 2).toFixed(3),
      mz: +((from.z + to.z) / 2).toFixed(3),
      angle: +Math.atan2(to.x - from.x, to.z - from.z).toFixed(3),
      duration,
    });
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
