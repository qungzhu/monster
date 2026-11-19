// 毛球地球 server: who sees what. Run: node server/tests/globe-test.mjs
import { GlobeHub, strangerSpot, MIN_HEAT } from '../globe.js';
import { BondStore } from '../plazaBonds.js';

let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? '✓' : '✗') + ' ' + name); };
const inbox = new Map();
const send = (id, m) => (inbox.get(id) ?? inbox.set(id, []).get(id)).push(m);
const last = (id, t) => (inbox.get(id) ?? []).filter(m => m.t === t).pop();
let clock = 1_000_000;
const now = () => clock;

const KA = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', KB = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', KC = '33333333-cccc-4ccc-8ccc-cccccccccccc';
const bonds = new BondStore();
// A and B are friends (10 points = level 1); C is a stranger to both
bonds.award(KA, KB, 'play'); bonds.award(KA, KB, 'play');
const hub = new GlobeHub(send, bonds, { salt: 'test', now });

const shanghai = { lat: 31.2304, lon: 121.4737 };
const seattle = { lat: 47.6062, lon: -122.3321 };
hub.connect('A'); hub.connect('B'); hub.connect('C');
hub.handle('A', { t: 'hello', key: KA, name: 'Alice', petName: '雪球', breed: 'plush-angora', share: true, ...shanghai });
hub.handle('B', { t: 'hello', key: KB, name: 'Bob', petName: '狮狮', breed: 'plush-birman', share: true, ...seattle });
hub.handle('C', { t: 'hello', key: KC, name: 'Coco', petName: '可可', breed: 'plush-himalayan', share: false, ...shanghai });
hub.tick();

const viewB = last('B', 'view');
const aForB = viewB.pets.find(p => p.id === 'A');
ok('好友看到对方，标记为好友', aForB && aForB.friend === true);
ok('好友位置只精确到 ~1km（两位小数）', aForB.lat === 31.23 && aForB.lon === 121.47);

const viewC = last('C', 'view');
const aForC = viewC.pets.find(p => p.id === 'A');
ok('陌生人看到的是模糊后的城市级位置', aForC && aForC.friend === false && (aForC.lat !== shanghai.lat || aForC.lon !== shanghai.lon));
const km = Math.hypot((aForC.lat - shanghai.lat) * 111, (aForC.lon - shanghai.lon) * 111 * Math.cos(shanghai.lat * Math.PI / 180));
ok(`陌生人位置偏离真实位置几公里到几十公里（${km.toFixed(1)} km）`, km > 1 && km < 40);
const again = strangerSpot('test', KA, shanghai.lat + 0.001, shanghai.lon + 0.001);
ok('同一个人小范围移动，陌生人看到的点不变（不能靠平均反推）', again.lat === aForC.lat && again.lon === aForC.lon);

ok('没开分享的人不出现在任何人的地图上', !viewB.pets.some(p => p.id === 'C') && !last('A', 'view').pets.some(p => p.id === 'C'));
ok('没开分享时服务器不保存位置', hub.players.get('C').lat === null);
ok('设备私钥不会发给任何人', !JSON.stringify([...inbox.values()]).includes(KA.slice(0, 8)));
ok('看不到自己（自己的猫由本机画）', !last('A', 'view').pets.some(p => p.id === 'A'));
ok('在线人数包含隐身的人', viewB.online === 3);

hub.handle('A', { t: 'share', on: false });
hub.tick();
ok('切到隐身：位置立即清除', hub.players.get('A').lat === null);
ok('切到隐身：从别人的地图上消失', !last('B', 'view').pets.some(p => p.id === 'A'));

// moving: rate limited
hub.handle('A', { t: 'share', on: true });
hub.handle('A', { t: 'pos', ...shanghai });
hub.handle('A', { t: 'pos', lat: 0, lon: 0 });
ok('位置更新限速（10 秒内第二次被忽略）', hub.players.get('A').lat === shanghai.lat);
clock += 11_000;
hub.handle('A', { t: 'pos', lat: 35.68, lon: 139.69 });
ok('10 秒后可以更新位置', hub.players.get('A').lat === 35.68);
hub.handle('A', { t: 'pos', lat: 999, lon: 0 });
ok('非法坐标被拒绝', hub.players.get('A').lat === 35.68);

// heat: thin cells hidden
for (let i = 0; i < MIN_HEAT - 1; i++) {
  hub.connect(`h${i}`);
  hub.handle(`h${i}`, { t: 'hello', key: `44444444-dddd-4ddd-8ddd-00000000000${i}`, share: true, lat: -33.9, lon: 151.2 });
}
hub.tick();
ok(`热力图：少于 ${MIN_HEAT} 人的格子不显示`, !last('B', 'view').heat.some(c => c.lat < -20));
hub.connect('hx'); hub.handle('hx', { t: 'hello', key: '44444444-dddd-4ddd-8ddd-0000000000ff', share: true, lat: -33.8, lon: 151.1 });
hub.tick();
ok(`热力图：凑够 ${MIN_HEAT} 人才显示，且只给格子中心`, last('B', 'view').heat.some(c => c.lat === -34 && c.lon === 150 && c.count === 3));

// waves
hub.handle('B', { t: 'wave', to: 'A' });
ok('打招呼送达对方', last('A', 'waved')?.from === '狮狮');
const before = (inbox.get('A') ?? []).filter(m => m.t === 'waved').length;
hub.handle('B', { t: 'wave', to: 'A' });
ok('打招呼限频（30 秒一次）', (inbox.get('A') ?? []).filter(m => m.t === 'waved').length === before);
hub.handle('B', { t: 'wave', to: 'C' });
ok('不能向隐身的人打招呼', !last('C', 'waved'));

// flooding
hub.connect('F'); let dropped = false;
for (let i = 0; i < 40 && !dropped; i++) dropped = !hub.handle('F', { t: 'share', on: true });
ok('刷消息会被断开', dropped);

hub.disconnect('B');
hub.tick();
ok('断线后立刻从地图上消失，不留记录', !hub.players.has('B') && !last('A', 'view').pets.some(p => p.id === 'B'));

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
