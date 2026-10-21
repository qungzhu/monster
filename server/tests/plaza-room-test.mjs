import { PlazaRoom } from '../plazaRoom.js';
const inbox = new Map(); const send = (id, m) => (inbox.get(id) ?? inbox.set(id, []).get(id)).push(m);
const last = (id, t) => (inbox.get(id) ?? []).filter(m => m.t === t).pop();
const room = new PlazaRoom(send);
for (const id of ['A','B','C']) room.join(id, { name: id, petName: id+'猫', breed: 'meshy-ragdoll' });
const place = (id, x, z) => Object.assign(room.peers.get(id), { x, z });
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? '✓' : '✗') + ' ' + name); };

place('A', 0, 0); place('B', 3, 0); place('C', 0.5, 0.5);
room.handle('A', { t: 'invite', to: 'B', kind: 'rub' });
ok('太远的邀请被拒(B 没收到)', !last('B','invited'));

place('B', 1.0, 0);
room.peers.get('A').lastInviteAt = 0;
room.handle('A', { t: 'invite', to: 'B', kind: 'rub' });
ok('靠近后 B 收到邀请', last('B','invited')?.from === 'A');

room.handle('A', { t: 'invite', to: 'B', kind: 'rub' });
ok('1.5 秒内重复邀请被限流', (inbox.get('B')||[]).filter(m=>m.t==='invited').length === 1);

room.handle('A', { t: 'invite', to: 'B', kind: 'dance' });
ok('非法互动类型被忽略', (inbox.get('B')||[]).filter(m=>m.t==='invited').length === 1);

room.handle('B', { t: 'reply', from: 'A', accept: true });
const it = last('C','interact');
ok('B 接受后全场(含旁观者 C)都收到 interact', !!it && last('A','interact') && last('B','interact'));
ok('互动参数正确: rub / 中点 / 4.5 秒', it && it.kind==='rub' && it.mx===0.5 && it.mz===0 && it.duration===4500);

room.peers.get('C').lastInviteAt = 0;
room.handle('C', { t: 'invite', to: 'A', kind: 'play' });
ok('正在互动的 A 不能再被邀请', !last('A','invited'));

room.handle('B', { t: 'reply', from: 'A', accept: true });
ok('同一邀请不能重复接受', (inbox.get('C')||[]).filter(m=>m.t==='interact').length === 1);

// decline flow (fresh pair, both free)
room.peers.get('A').busyUntil = 0; room.peers.get('B').busyUntil = 0;
place('C', 0.4, 0.4); room.peers.get('C').lastInviteAt = 0;
room.handle('C', { t: 'invite', to: 'A', kind: 'play' });
room.handle('A', { t: 'reply', from: 'C', accept: false });
ok('拒绝后邀请方收到 declined', last('C','declined')?.petName === 'A猫');

// expired invite
room.peers.get('C').lastInviteAt = 0;
room.handle('C', { t: 'invite', to: 'B', kind: 'play' });
room.peers.get('B').invites.get('C').at -= 16000;
room.handle('B', { t: 'reply', from: 'C', accept: true });
ok('超过 8 秒的邀请接受无效', (inbox.get('A')||[]).filter(m=>m.t==='interact').length === 1);

// leave cleans pending invites
room.peers.get('C').lastInviteAt = 0;
room.handle('C', { t: 'invite', to: 'B', kind: 'rub' });
room.leave('C');
ok('邀请方离开后邀请被清除', !room.peers.get('B').invites.has('C'));
ok('过期时双方都收到提示', /过期/.test(last('B','error')?.message||'') && /再邀请/.test(last('C','error')?.message||''));

process.exit(failed ? 1 : 0);
