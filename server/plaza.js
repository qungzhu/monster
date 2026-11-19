// Real-time server for the shared snow plaza and the live globe (毛球地球).
// Rooms fill up to ROOM_CAPACITY, then new players go to the next room
// ("雪原 1 区", "2 区", ...). Run with `npm run plaza` (port 3002); Vite
// proxies /plaza-ws to it in dev.
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PlazaRoom, TICK_MS } from './plazaRoom.js';
import { BondStore } from './plazaBonds.js';
import { GlobeHub, VIEW_MS } from './globe.js';

// PORT is what hosting platforms (Render, Fly, Railway...) hand us.
const PORT = Number(process.env.PORT || process.env.PLAZA_PORT || 3002);
const sockets = new Map();      // peerId -> ws
const rooms = [];               // index = room number - 1

// Friendship persists across restarts in a local JSON file (gitignored).
const BONDS_FILE = resolve(process.env.PLAZA_BONDS_FILE || 'server/data/plaza-bonds.json');
let saveTimer = null;
const saveBonds = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      mkdirSync(dirname(BONDS_FILE), { recursive: true });
      writeFileSync(`${BONDS_FILE}.tmp`, JSON.stringify(bonds.toJSON()));
      renameSync(`${BONDS_FILE}.tmp`, BONDS_FILE);   // atomic replace
    } catch (err) {
      console.error('[plaza] failed to save bonds:', err.message);
    }
  }, 1000);
};
let snapshot = {};
try { snapshot = JSON.parse(readFileSync(BONDS_FILE, 'utf8')); } catch { /* first run */ }
const bonds = new BondStore(snapshot, saveBonds);

const send = (id, obj) => {
  const ws = sockets.get(id);
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
};

function pickRoom() {
  let i = rooms.findIndex(r => !r.full);
  if (i === -1) {
    rooms.push(new PlazaRoom(send, bonds));
    i = rooms.length - 1;
  }
  return i;
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });

wss.on('connection', ws => {
  const id = randomUUID().slice(0, 8);
  let roomIndex = -1;
  sockets.set(id, ws);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg?.t === 'join' && roomIndex === -1) {
      roomIndex = pickRoom();
      rooms[roomIndex].join(id, msg);
      send(id, { t: 'room', number: roomIndex + 1 });
      return;
    }
    if (roomIndex === -1) return;
    if (!rooms[roomIndex].handle(id, msg)) ws.close(1008, 'too many messages');
  });

  ws.on('close', () => {
    if (roomIndex !== -1) rooms[roomIndex].leave(id);
    sockets.delete(id);
  });
});

setInterval(() => rooms.forEach(r => r.tick()), TICK_MS);

// ---- 毛球地球: one hub for everyone, privacy handled in server/globe.js
const globeSockets = new Map();
const globe = new GlobeHub((id, obj) => {
  const ws = globeSockets.get(id);
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}, bonds, { salt: process.env.GLOBE_SALT });
const globeWss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
globeWss.on('connection', ws => {
  const id = randomUUID().slice(0, 8);
  globeSockets.set(id, ws);
  globe.connect(id);
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!globe.handle(id, msg)) ws.close(1008, 'too many messages');
  });
  ws.on('close', () => { globe.disconnect(id); globeSockets.delete(id); });
});
setInterval(() => globe.tick(), VIEW_MS);

// ---- one HTTP server: health check for the host, sockets by path
const http = createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404).end();
});
http.on('upgrade', (req, socket, head) => {
  const path = (req.url ?? '').split('?')[0];
  const target = path === '/plaza-ws' ? wss : path === '/globe-ws' ? globeWss : null;
  if (!target) { socket.destroy(); return; }
  target.handleUpgrade(req, socket, head, ws => target.emit('connection', ws, req));
});
http.listen(PORT, () => {
  console.log(`FurryPal plaza on ws://localhost:${PORT}/plaza-ws, globe on /globe-ws`);
});
