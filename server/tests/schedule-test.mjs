// Offline reminders: recurrence, the job builder and the server store.
// Run: npm run test:schedule
import assert from 'node:assert/strict';
import { fromLocal, localParts, nextOccurrence, rollForward } from '../../shared/recurrence.js';
import { ScheduleStore, STALE_MS, validSubscription } from '../scheduler.js';
import { buildJobs, defaultProactive } from '../../src/proactive/jobs.ts';
import { parseRepeat } from '../../src/data/time.ts';

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const SH = 'Asia/Shanghai', NY = 'America/New_York';
const H = 3_600_000, DAY = 24 * H;
const local = (ms, tz = SH) => { const p = localParts(ms, tz); return `${p.mo}/${p.d} ${p.h}:${String(p.mi).padStart(2, '0')}`; };

check('repeats keep local time (month ends, weekends, DST)', () => {
  const fri = fromLocal(2026, 10, 30, 8, 0, SH);
  assert.equal(local(nextOccurrence(fri, 'daily', SH)), '10/31 8:00');
  assert.equal(local(nextOccurrence(fri, 'weekdays', SH)), '11/2 8:00');
  assert.equal(local(nextOccurrence(fri, 'weekly', SH)), '11/6 8:00');
  assert.equal(local(nextOccurrence(fromLocal(2027, 1, 31, 9, 0, SH), 'monthly', SH)), '2/28 9:00');
  const ny = fromLocal(2026, 10, 31, 8, 0, NY); // DST ends Nov 1
  assert.equal(local(nextOccurrence(ny, 'daily', NY), NY), '11/1 8:00');
  assert.equal(nextOccurrence(ny, 'daily', NY) - ny, 25 * H);
  assert.equal(local(rollForward(fromLocal(2026, 10, 31, 8, 0, SH), 'weekdays', SH, fromLocal(2026, 10, 30, 0, 0, SH))), '11/2 8:00');
});

check('parseRepeat: 每天/工作日/每周/每月', () => {
  const now = new Date(fromLocal(2026, 10, 27, 10, 0, SH)); // Tue
  const t = (text) => { const r = parseRepeat(text, now, SH); return `${r.repeat} ${local(Date.parse(r.due))} ${r.rest}`; };
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== SH) return; // parseDue uses local time
  assert.equal(t('每天早上8点提醒我喝水'), 'daily 10/28 8:00 喝水');
  assert.equal(t('每周一晚上提醒我交周报'), 'weekly 11/2 20:00 交周报');
  assert.equal(t('每月5号提醒我交房租'), 'monthly 11/5 9:00 交房租');
  assert.equal(t('工作日8点半提醒我打卡'), 'weekdays 10/28 8:30 打卡');
});

check('job builder: reminders, morning, event day, miss-you', () => {
  const now = fromLocal(2026, 10, 27, 10, 0, SH);
  const items = [
    { id: 'a', type: 'todo', title: '喝水', createdAt: '', completed: false, due: new Date(fromLocal(2026, 10, 28, 8, 0, SH)).toISOString(), repeat: 'daily' },
    { id: 'b', type: 'todo', title: '已完成', createdAt: '', completed: true, due: new Date(now + H).toISOString() },
    { id: 'c', type: 'todo', title: '提醒过了', createdAt: '', completed: false, due: new Date(now - H).toISOString(), remindedAt: 'x' },
    { id: 'd', type: 'todo', title: '太久以前', createdAt: '', completed: false, due: new Date(now - 2 * DAY).toISOString() },
  ];
  const memories = [{ id: 'm1', text: '周四考试(10月27日说的)', category: 'event', source: 'auto', createdAt: now, updatedAt: now, when: new Date(fromLocal(2026, 10, 29, 9, 0, SH)).toISOString() }];
  const jobs = buildJobs({ items, memories, settings: defaultProactive, petName: '斑斑', now, tz: SH });
  const view = jobs.map(j => `${j.kind} ${local(j.at)} ${j.body}`);
  assert.deepEqual(view, [
    'reminder 10/28 8:00 喝水',
    'morning 10/28 8:30 早安!新的一天开始啦,有什么要我帮你记着的就跟我说~',
    'event-day 10/29 8:30 今天就是「考试」的日子啦!深呼吸,你一定可以的~',
    'event-followup 10/29 18:00 今天的「考试」怎么样?回来跟我说说吧~',
    'miss-you 10/29 19:00 好想你呀…已经两天没见到你了,来看看我好不好?',
  ]);
  const off = buildJobs({ items: [], memories, settings: { ...defaultProactive, morning: false, eventCare: false, missYou: false }, petName: '斑斑', now, tz: SH });
  assert.equal(off.length, 0);
});

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } };
const KEY = 'k'.repeat(32);

check('subscriptions only to known push services', () => {
  assert.ok(validSubscription(sub));
  assert.equal(validSubscription({ ...sub, endpoint: 'https://evil.example/x' }), null);
  assert.equal(validSubscription({ ...sub, endpoint: 'http://fcm.googleapis.com/x' }), null);
  assert.equal(validSubscription({ ...sub, endpoint: 'http://127.0.0.1:9/x' }), null);
  assert.ok(validSubscription({ ...sub, endpoint: 'http://127.0.0.1:9/x' }, true));
});

check('store: due jobs are sent once; repeats advance; stale skipped', () => {
  const now = fromLocal(2026, 10, 27, 10, 0, SH);
  const s = new ScheduleStore();
  assert.equal(s.sync('short', { jobs: [] }, now), false);
  s.sync(KEY, { tz: SH, subscription: sub, jobs: [
    { id: 'r:a', kind: 'reminder', at: now + 60_000, title: 't', body: '喝水', repeat: 'daily' },
    { id: 'r:b', kind: 'reminder', at: now + 60_000, title: 't', body: '取快递' },
    { id: 'r:old', kind: 'reminder', at: now - STALE_MS - 1, title: 't', body: '过期' },
    { id: 'x', kind: 'hack', at: now, body: 'no' },
    { id: 'r:c', kind: 'reminder', at: now + 60_000, title: 't', body: '' },
  ] }, now);
  assert.equal(s.devices.get(KEY).jobs.length, 3);
  assert.deepEqual(s.takeDue(now).map(x => x.job.body), []);           // stale one dropped silently
  const sent = s.takeDue(now + 61_000);
  assert.deepEqual(sent.map(x => x.job.body).sort(), ['取快递', '喝水']);
  assert.deepEqual(s.devices.get(KEY).jobs.map(j => `${j.id} ${local(j.at)}`), ['r:a 10/28 10:01']);
  // The client re-syncs its stale list before learning r:b fired: not sent twice.
  s.sync(KEY, { tz: SH, jobs: [{ id: 'r:b', kind: 'reminder', at: now + 60_000, title: 't', body: '取快递' }] }, now + 62_000);
  assert.equal(s.takeDue(now + 63_000).length, 0);
  assert.ok(s.devices.get(KEY).subscription, 'subscription kept when a sync omits it');
});

check('store: no subscription → nothing sent; forget deletes; survives JSON', () => {
  const now = Date.now();
  const s = new ScheduleStore();
  s.sync(KEY, { tz: 'Not/AZone', jobs: [{ id: 'm', kind: 'morning', at: now - 1, title: 't', body: '早安', repeat: 'daily' }] }, now);
  assert.equal(s.devices.get(KEY).tz, 'UTC');
  assert.equal(s.takeDue(now).length, 0);
  assert.ok(s.devices.get(KEY).jobs[0].at > now);                        // still advanced
  const copy = new ScheduleStore(JSON.parse(JSON.stringify(s.toJSON())));
  assert.equal(copy.devices.get(KEY).jobs.length, 1);
  copy.forget(KEY);
  assert.equal(copy.devices.size, 0);
});

console.log(`schedule: ${passed} checks passed`);
