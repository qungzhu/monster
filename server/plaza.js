// Local real-time server for the shared snow plaza.
// Rooms fill up to ROOM_CAPACITY, then new players go to the next room
// ("雪原 1 区", "2 区", ...). Run with `npm run plaza` (port 3002); Vite
// proxies /plaza-ws to it in dev.
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { PlazaRoom, TICK_MS } from './plazaRoom.js';

const PORT = Number(process.env.PLAZA_PORT || 3002);
const sockets = new Map();      // peerId -> ws
const rooms = [];               // index = room number - 1

const send = (id, obj) => {
  const ws = sockets.get(id);
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
};

function pickRoom() {
  let i = rooms.findIndex(r => !r.full);
  if (i === -1) {
    rooms.push(new PlazaRoom(send));
    i = rooms.length - 1;
  }
  return i;
}

const wss = new WebSocketServer({ port: PORT, path: '/plaza-ws', maxPayload: 2048 });

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

console.log(`FurryPal plaza running on ws://localhost:${PORT}/plaza-ws`);
