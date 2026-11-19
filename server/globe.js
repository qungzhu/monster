// 毛球地球 (live globe) — server side. Pure logic, no sockets: the host
// (server/plaza.js) feeds it messages and gives it a send(id, obj).
//
// Privacy is enforced HERE, never in the client. Every viewer gets a view
// built just for them:
//   - friends (bond level 1+, keyed by private device keys) see a position
//     rounded to ~1 km;
//   - strangers only see a city-level spot: the position snapped to a coarse
//     grid, then pushed a few km in a direction fixed per player (a fixed
//     offset can't be averaged away by watching for a while);
//   - the heat map is counts on a 4° grid, cells under 3 people dropped.
// Exact coordinates are kept in memory only while the player is connected
// and sharing; they are never logged, saved, or sent to anyone.
//
// Protocol (client -> server):
//   { t: 'hello', key, name, petName, breed, share, lat?, lon? }
//   { t: 'pos', lat, lon }           // at most once per POS_MIN_MS
//   { t: 'share', on }               // ghost mode off/on
//   { t: 'wave', to }                // say hi to a cat on the globe
// (server -> client):
//   { t: 'welcome', id }
//   { t: 'view', pets: [{ id, name, petName, breed, lat, lon, friend }], heat: [{ lat, lon, count }], online }
//   { t: 'waved', from: petName, name }
//   { t: 'error', message }

import { createHash, randomUUID } from 'node:crypto';
import { levelOf } from './plazaBonds.js';

export const VIEW_MS = 5000;          // how often views are pushed
export const POS_MIN_MS = 10_000;     // fastest a client may move its pin
export const HEAT_CELL_DEG = 4;
export const MIN_HEAT = 3;
export const STRANGER_GRID_DEG = 0.25; // ~25 km: city level
export const FRIEND_ROUND_DEG = 0.01;  // ~1 km: neighbourhood
export const MAX_STRANGERS = 150;      // per view, nearest first
const WAVE_GAP_MS = 30_000;
const KEY_RE = /^[A-Za-z0-9-]{16,64}$/;   // same rule as the plaza (UUIDs)
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

/** Deterministic 0..1 from a string (per-player fixed offsets). */
function hash01(s) {
  return createHash('sha256').update(s).digest().readUInt32BE(0) / 2 ** 32;
}

const validLat = v => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
const validLon = v => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;

/** What a stranger may know of a position: grid cell centre + fixed nudge. */
export function strangerSpot(salt, key, lat, lon) {
  const g = STRANGER_GRID_DEG;
  const cLat = (Math.floor(lat / g) + 0.5) * g;
  const cLon = (Math.floor(lon / g) + 0.5) * g;
  const angle = hash01(`${salt}:${key}:a`) * Math.PI * 2;
  const km = 3 + hash01(`${salt}:${key}:d`) * 5;
  const dLat = (km / 111) * Math.cos(angle);
  const dLon = (km / (111 * Math.max(0.2, Math.cos((cLat * Math.PI) / 180)))) * Math.sin(angle);
  return { lat: +(cLat + dLat).toFixed(3), lon: +(((cLon + dLon + 540) % 360) - 180).toFixed(3) };
}

export function friendSpot(lat, lon) {
  const r = v => Math.round(v / FRIEND_ROUND_DEG) * FRIEND_ROUND_DEG;
  return { lat: +r(lat).toFixed(2), lon: +r(lon).toFixed(2) };
}

export function heatGrid(points) {
  const cells = new Map();
  for (const p of points) {
    const k = `${Math.floor(p.lat / HEAT_CELL_DEG)},${Math.floor(p.lon / HEAT_CELL_DEG)}`;
    cells.set(k, (cells.get(k) ?? 0) + 1);
  }
  const out = [];
  for (const [k, count] of cells) {
    if (count < MIN_HEAT) continue;
    const [a, b] = k.split(',').map(Number);
    out.push({ lat: (a + 0.5) * HEAT_CELL_DEG, lon: (b + 0.5) * HEAT_CELL_DEG, count });
  }
  return out;
}

export class GlobeHub {
  /**
   * @param {(id: string, obj: object) => void} send
   * @param {import('./plazaBonds.js').BondStore} bonds friendship (shared with the plaza)
   * @param {{ salt?: string, now?: () => number }} [opts]
   */
  constructor(send, bonds, opts = {}) {
    this.send = send;
    this.bonds = bonds;
    // per-deployment salt: the stranger offset can't be computed from a key
    this.salt = opts.salt ?? randomUUID();
    this.now = opts.now ?? Date.now;
    this.players = new Map();   // id -> { id, key, name, petName, breed, share, lat, lon, lastPos, waves }
    this.heat = [];
    this.heatAt = 0;
  }

  connect(id) {
    this.players.set(id, { id, key: null, share: false, lat: null, lon: null, lastPos: 0, waves: new Map(), budget: 20, budgetAt: this.now() });
  }

  disconnect(id) {
    this.players.delete(id);   // position forgotten at once
  }

  /** @returns {boolean} false when the client should be dropped (flooding) */
  handle(id, msg) {
    const p = this.players.get(id);
    if (!p || !msg || typeof msg !== 'object') return true;
    // token bucket: ~1 message/s sustained, bursts of 20
    const now = this.now();
    p.budget = Math.min(20, p.budget + (now - p.budgetAt) / 1000);
    p.budgetAt = now;
    if (p.budget < 1) return false;
    p.budget -= 1;

    switch (msg.t) {
      case 'hello': {
        if (p.key) return true;   // once
        p.key = KEY_RE.test(String(msg.key ?? '')) ? String(msg.key) : `anon${randomUUID().replace(/-/g, '')}`;
        p.name = clean(msg.name, 20) || '铲屎官';
        p.petName = clean(msg.petName, 20) || '小猫';
        p.breed = clean(msg.breed, 40);
        p.share = msg.share === true;
        this.setPos(p, msg.lat, msg.lon);
        this.send(id, { t: 'welcome', id });
        this.sendView(p);
        return true;
      }
      case 'pos':
        if (now - p.lastPos >= POS_MIN_MS) this.setPos(p, msg.lat, msg.lon);
        return true;
      case 'share':
        p.share = msg.on === true;
        if (p.share) p.lastPos = 0;                 // let the first pin through
        else { p.lat = null; p.lon = null; }        // ghost: forget it at once
        this.sendView(p);
        return true;
      case 'wave': {
        const to = this.players.get(String(msg.to ?? ''));
        if (!p.key || !to || to === p || !to.share) return true;
        const last = p.waves.get(to.id) ?? 0;
        if (now - last < WAVE_GAP_MS) return true;
        p.waves.set(to.id, now);
        this.send(to.id, { t: 'waved', from: p.petName, name: p.name });
        return true;
      }
      default:
        return true;
    }
  }

  setPos(p, lat, lon) {
    // a position is only ever held while its owner is sharing
    if (!p.share || !validLat(lat) || !validLon(lon)) return;
    p.lat = lat; p.lon = lon; p.lastPos = this.now();
  }

  isFriend(a, b) {
    return !!a.key && !!b.key && a.key !== b.key && levelOf(this.bonds.total(a.key, b.key)) >= 1;
  }

  /** Everyone sharing, with a position. */
  sharing() {
    return [...this.players.values()].filter(q => q.key && q.share && q.lat !== null);
  }

  viewFor(viewer) {
    const out = [];
    const strangers = [];
    for (const q of this.sharing()) {
      if (q.id === viewer.id) continue;
      const friend = this.isFriend(viewer, q);
      const base = { id: q.id, name: q.name, petName: q.petName, breed: q.breed, friend };
      if (friend) out.push({ ...base, ...friendSpot(q.lat, q.lon) });
      else strangers.push({ ...base, ...strangerSpot(this.salt, q.key, q.lat, q.lon) });
    }
    // payload bound: nearest strangers to the viewer (or anyone, if hidden)
    if (strangers.length > MAX_STRANGERS) {
      if (viewer.lat !== null) {
        const d = s => (s.lat - viewer.lat) ** 2 + (s.lon - viewer.lon) ** 2;
        strangers.sort((a, b) => d(a) - d(b));
      }
      strangers.length = MAX_STRANGERS;
    }
    return [...out, ...strangers];
  }

  sendView(viewer) {
    if (!viewer.key) return;
    this.send(viewer.id, { t: 'view', pets: this.viewFor(viewer), heat: this.heat, online: [...this.players.values()].filter(q => q.key).length });
  }

  /** Called every VIEW_MS by the host. */
  tick() {
    this.heat = heatGrid(this.sharing());
    for (const p of this.players.values()) this.sendView(p);
  }
}
