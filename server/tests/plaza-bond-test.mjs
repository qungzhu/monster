import { PlazaRoom } from '../plazaRoom.js';
import { BondStore } from '../plazaBonds.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inbox = new Map(); const sent = [];
const send = (id, m) => { sent.push(JSON.stringify(m)); (inbox.get(id) ?? inbox.set(id, []).get(id)).push(m); };
const all = (id, t) => (inbox.get(id) ?? []).filter(m => m.t === t);
const last = (id, t) => all(id, t).pop();
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? '✓' : '✗') + ' ' + name); };
const KA = 'alicekey-1234567890ab', KB = 'bobkey-1234567890abcd', KC = 'cocokey-1234567890abcd';

let saves = 0;
const store = new BondStore({}, () => saves++);
const room = new PlazaRoom(send, store);
const place = (id, x, z) => Object.assign(room.peers.get(id), { x, z });
const dance = async (a, b, kind, wait) => {
  room.peers.get(a).lastInviteAt = 0;
  room.handle(a, { t: 'invite', to: b, kind });
  room.handle(b, { t: 'reply', from: a, accept: true });
  await sleep(wait);
};

room.join('A', { name: 'Alice', petName: '雪球', breed: 'meshy-ragdoll', key: KA });
room.join('B', { name: 'Bob', petName: '狮狮', breed: 'meshy-mainecoon', key: KB });
place('A', 0, 0); place('B', 1, 0);

await dance('A', 'B', 'play', 6200);
const bA = last('A', 'bond'), bB = last('B', 'bond');
ok('一起玩结束后双方各 +5 好感', bA?.gained === 5 && bB?.gained === 5 && bA.total === 5);
ok('好感消息指向对方的会话 id 和猫名', bA?.with === 'B' && bA?.petName === '狮狮' && bB?.with === 'A');

await dance('A', 'B', 'rub', 4700);
ok('一起蹭蹭 +3,累计 8', last('A', 'bond')?.gained === 3 && last('A', 'bond')?.total === 8);

await dance('A', 'B', 'play', 6200);   // total 13 -> crosses 10
ok('跨过 10 分时提示升级(点头之交)', last('A', 'bond')?.levelUp === true && last('A', 'bond')?.level === 1);

await dance('A', 'B', 'play', 6200);   // today 18
await dance('A', 'B', 'play', 6200);   // cap 20 -> only +2
const capped = last('A', 'bond');
ok('每天上限 20:最后一次只加 2 分并标记已封顶', capped?.gained === 2 && capped?.capped === true && capped?.total === 20);
await dance('A', 'B', 'rub', 4700);
ok('封顶后再互动 +0', last('A', 'bond')?.gained === 0 && last('A', 'bond')?.total === 20);

// leave mid-dance -> no points
room.join('C', { name: 'Coco', petName: '布丁', breed: 'meshy-persian', key: KC });
place('C', 0.5, 0.5);
room.peers.get('C').lastInviteAt = 0;
room.handle('C', { t: 'invite', to: 'A', kind: 'play' });
room.handle('A', { t: 'reply', from: 'C', accept: true });
room.leave('C');
await sleep(6200);
ok('中途离开不加分', store.total(KA, KC) === 0);

// same device, two tabs
room.join('A2', { name: 'Alice2', petName: '雪球2', breed: 'meshy-ragdoll', key: KA });
place('A2', 0.3, 0);
await dance('A2', 'A', 'play', 6200);
ok('同一台设备两个窗口不能刷分', store.total(KA, KA) === 0 && !all('A2', 'bond').some(m => m.gained > 0));

// reconnect: new session id, same key -> friends list keeps the bond
room.leave('B');
room.join('B9', { name: 'Bob', petName: '狮狮', breed: 'meshy-mainecoon', key: KB });
const list = last('B9', 'bonds')?.list ?? [];
const alice = list.find(f => f.total === 20);
ok('换会话重连后好友列表还在(Alice 20 分,在线)', alice?.total === 20 && ['A','A2'].includes(alice?.online));
ok('重连时双方都收到已有好感', last('A', 'bond')?.with === 'B9' && last('A', 'bond')?.gained === 0 && last('B9', 'bond')?.total === 20);

ok('任何消息都不包含私有身份码', !sent.some(m => m.includes(KA) || m.includes(KB) || m.includes(KC)));
ok('好感变化会触发保存', saves > 0);

const re = new BondStore(JSON.parse(JSON.stringify(store.toJSON())));
ok('存档可恢复', re.total(KA, KB) === 20);
process.exit(failed ? 1 : 0);
