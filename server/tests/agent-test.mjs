// Task agent rules (src/data/agent.ts). Run: npm run test:agent
import assert from 'node:assert/strict';
import { CANCEL_RE, CONFIRM_RE, looksLikeTask, normalizePlan, parseDue, planLocally } from '../../src/data/agent.ts';

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
// Monday 2026-10-26 10:00 local time.
const now = new Date(2026, 9, 26, 10, 0, 0);
const at = (d, h, m = 0) => new Date(2026, 9, 26 + d, h, m, 0).toISOString();
const items = [
  { id: 'i1', type: 'package', title: '取快递', createdAt: '', completed: false },
  { id: 'i2', type: 'study', title: '复习英语单词', createdAt: '', completed: false },
  { id: 'i3', type: 'todo', title: '交房租', createdAt: '', completed: true },
];
const plan = t => planLocally(t, items, now);

check('due times: days, weekdays, clock, relative', () => {
  assert.equal(parseDue('明天下午3点', now).due, at(1, 15));
  assert.equal(parseDue('周五晚上8点半', now).due, at(4, 20, 30));
  assert.equal(parseDue('下周三上午10点', now).due, at(9, 10));
  assert.equal(parseDue('周日', now).due, at(6, 9));
  assert.equal(parseDue('30分钟后', now).due, new Date(now.getTime() + 30 * 60_000).toISOString());
  assert.equal(parseDue('9点', now).due, at(1, 9));          // 9:00 already passed today
  assert.equal(parseDue('十一月三号', now).due, new Date(2026, 10, 3, 9).toISOString());
  assert.equal(parseDue('买牛奶', now), null);
});

check('compound request becomes two actions', () => {
  const p = plan('明天下午3点提醒我取快递，再记一下体重60');
  assert.deepEqual(p.actions.map(a => a.type), ['add_item', 'add_item']);
  assert.equal(p.actions[0].title, '取快递');
  assert.equal(p.actions[0].due, at(1, 15));
  assert.equal(p.actions[1].itemType, 'weight');
  const r = plan('每天早上8点提醒我喝水，再提醒我每周一晚上交周报');
  assert.deepEqual(r.actions.map(a => `${a.title} ${a.repeat}`), ['喝水 daily', '交周报 weekly']);
});

check('complete / remove match existing items', () => {
  assert.deepEqual(plan('快递取到了').actions[0], { type: 'complete_item', id: 'i1', title: '取快递' });
  assert.equal(plan('英语单词复习完了').actions[0].id, 'i2');
  assert.deepEqual(plan('删掉取快递').actions[0], { type: 'remove_item', id: 'i1', title: '取快递' });
});

check('role switch and calendar', () => {
  assert.deepEqual(plan('以后你当我的老师吧').actions[0], { type: 'set_role', role: 'teacher' });
  const c = plan('下周三上午10点开会，加到日历').actions[0];
  assert.equal(c.type, 'calendar_event');
  assert.equal(c.summary, '开会');
});

check('chat is not a task', () => {
  for (const t of ['今天好累啊', '我喜欢吃草莓', '你在干嘛', '看看待办']) {
    assert.ok(!looksLikeTask(t) || !plan(t), t);
  }
});

check('normalizePlan drops unknown ids/types and maps calendar without connection', () => {
  const raw = { reply: '好', actions: [
    { type: 'complete_item', id: 'nope' },
    { type: 'rm_rf', path: '/' },
    { type: 'set_role', role: 'boss' },
    { type: 'calendar_event', summary: '开会', start: at(1, 10) },
    { type: 'add_item', itemType: 'weird', title: '买牛奶', due: 'not a date' },
  ] };
  const p = normalizePlan(raw, 'x', items, false);
  assert.deepEqual(p.actions, [
    { type: 'add_item', itemType: 'todo', title: '开会', due: at(1, 10) },
    { type: 'add_item', itemType: 'todo', title: '买牛奶', due: undefined },
  ]);
  assert.equal(normalizePlan({ actions: [] }, 'x', items, false), null);
  assert.equal(normalizePlan({ actions: new Array(20).fill({ type: 'add_item', title: 'a' }) }, 'x', items, false).actions.length, 6);
});

check('confirm / cancel words', () => {
  for (const t of ['好的', '好呀', '确认', '可以', 'OK', '执行吧']) assert.ok(CONFIRM_RE.test(t), t);
  for (const t of ['算了', '取消', '不用了']) assert.ok(CANCEL_RE.test(t), t);
  assert.ok(!CONFIRM_RE.test('好的，再加一个'));
});

console.log(`agent: ${passed} checks passed`);
