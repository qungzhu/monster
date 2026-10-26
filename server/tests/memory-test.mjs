// Long-term memory rules (src/data/memory.ts). Run: npm run test:memory
import assert from 'node:assert/strict';
import { applyMemoryOps, extractMemoriesLocally, memoryCommand, memoryContext, pendingFollowUp, recallLine } from '../../src/data/memory.ts';

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const learn = (list, text, now = Date.now()) => applyMemoryOps(list, extractMemoriesLocally(text, list, new Date(now)), now).next;
const texts = list => list.map(m => m.text);

check('extracts name, likes, job, workplace, event', () => {
  let l = [];
  for (const t of ['我叫小雨', '我喜欢吃草莓', '我是程序员，在字节上班', '下周三要考试']) l = learn(l, t);
  assert.deepEqual(texts(l).slice(0, 4), ['名字叫小雨', '喜欢吃草莓', '是程序员', '在字节上班']);
  assert.match(l[4].text, /^下周三考试/);
  assert.equal(l[4].category, 'event');
});

check('"我喜欢你" is not a preference', () => {
  assert.equal(extractMemoriesLocally('我喜欢你', []).length, 0);
});

check('slots replace old values; dislikes override likes', () => {
  let l = learn([], '我是学生');
  l = learn(l, '我是老师');
  assert.deepEqual(texts(l), ['是老师']);
  l = learn(l, '我喜欢吃香菜');
  l = learn(l, '我不喜欢吃香菜');
  assert.deepEqual(texts(l), ['是老师', '不喜欢吃香菜']);
});

check('duplicates are merged', () => {
  let l = learn([], '我喜欢吃草莓');
  l = learn(l, '我超喜欢吃草莓');
  assert.equal(l.length, 1);
});

check('remember / forget commands, anchored to sentence start', () => {
  let l = learn([], '下周三要考试');
  const r = memoryCommand('记住我对芒果过敏', l);
  assert.equal(r.kind, 'remember');
  assert.equal(r.ops[0].text, '对芒果过敏');
  assert.equal(r.ops[0].source, 'manual');
  assert.equal(memoryCommand('把考试忘掉吧', l).ops.length, 1);
  assert.equal(memoryCommand('忘掉考试的事', l).ops.length, 1);
  assert.equal(memoryCommand('我忘记吃早饭了', l), null);
  assert.equal(memoryCommand('记一下体重60', l), null); // life command, not memory
});

check('follow-up after 1–14 days, once', () => {
  const day = 86_400_000, now = Date.now();
  const l = learn([], '明天面试', now - 2 * day);
  assert.equal(pendingFollowUp(l, now - 1.5 * day), null);     // too soon
  assert.equal(pendingFollowUp(l, now)?.id, l[0].id);
  assert.match(recallLine(l, now).line, /你之前说「明天面试」/);
  assert.equal(pendingFollowUp([{ ...l[0], followedUp: true }], now), null);
  assert.equal(pendingFollowUp(l, now + 20 * day), null);       // too old
});

check('dated events: no follow-up before the day, from 18:00 on it', () => {
  const now = new Date(2026, 9, 26, 10).getTime(); // Monday
  const l = learn([], '周三要考试', now);
  assert.equal(new Date(l[0].when).getDate(), 28);
  assert.equal(pendingFollowUp(l, new Date(2026, 9, 27, 20).getTime()), null); // day before
  assert.equal(pendingFollowUp(l, new Date(2026, 9, 28, 12).getTime()), null); // exam in progress
  assert.equal(pendingFollowUp(l, new Date(2026, 9, 28, 19).getTime())?.id, l[0].id);
});

check('context groups by category; limit keeps manual memories', () => {
  let l = learn([], '我叫小雨');
  l = learn(l, '我喜欢猫');
  assert.equal(memoryContext(l), '【关于你】名字叫小雨\n【喜好】喜欢猫');
  const ops = [{ op: 'add', text: '手动记住的事', category: 'profile', source: 'manual' }];
  for (let i = 0; i < 130; i++) ops.push({ op: 'add', text: `事情编号${i}号`, category: 'goal' });
  const big = applyMemoryOps([], ops).next;
  assert.equal(big.length, 120);
  assert.ok(big.some(m => m.source === 'manual'));
});

console.log(`memory: ${passed} checks passed`);
