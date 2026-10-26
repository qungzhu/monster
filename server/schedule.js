/**
 * Offline reminders over Web Push: routes + a ticker around ScheduleStore.
 *
 *   GET  /api/schedule/vapid   → { publicKey }
 *   POST /api/schedule/sync    { key, tz, subscription, jobs } → { ok, next }
 *   POST /api/schedule/forget  { key }   (turning notifications off)
 *   POST /api/schedule/test    { key }   (send one right now)
 *
 * The device key is a private random id kept in the browser; there are no
 * accounts. VAPID keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, or
 * are generated once into server/data/vapid.json.
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import webpush from 'web-push';
import { ScheduleStore, validKey } from './scheduler.js';

const TICK_MS = Number(process.env.SCHEDULE_TICK_MS) || 15_000;

function loadJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}
function saveJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(data));
  renameSync(`${file}.tmp`, file); // atomic replace
}

function vapidKeys(file) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const saved = loadJson(file);
  if (saved?.publicKey && saved?.privateKey) return saved;
  const keys = webpush.generateVAPIDKeys();
  saveJson(file, keys);
  return keys;
}

export function mountSchedule(app) {
  const file = resolve(process.env.SCHEDULE_FILE || 'server/data/schedules.json');
  const store = new ScheduleStore(loadJson(file) ?? {}, {
    // Only for local tests that point subscriptions at a fake push server.
    allowAnyEndpoint: process.env.PUSH_ALLOW_ANY_ENDPOINT === '1',
  });
  const keys = vapidKeys(resolve(process.env.VAPID_FILE || 'server/data/vapid.json'));
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:furrypal@example.com', keys.publicKey, keys.privateKey);

  let saveTimer;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { saveJson(file, store.toJSON()); } catch (e) { console.error('Schedule save failed:', e.message); }
    }, 500);
  };

  const push = async (key, subscription, job) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(job), { TTL: 3600, urgency: 'high' });
      return true;
    } catch (e) {
      // Gone: the browser unsubscribed or the subscription expired.
      if (e.statusCode === 404 || e.statusCode === 410) { store.dropSubscription(key); save(); }
      else console.error('Push failed:', e.statusCode ?? '', e.message);
      return false;
    }
  };

  app.get('/api/schedule/vapid', (_req, res) => res.json({ publicKey: keys.publicKey }));

  app.post('/api/schedule/sync', (req, res) => {
    const { key, tz, subscription, jobs } = req.body ?? {};
    if (!store.sync(key, { tz, subscription, jobs })) return res.status(400).json({ error: 'bad_key' });
    save();
    const d = store.devices.get(key);
    res.json({ ok: true, jobs: d.jobs.length, push: Boolean(d.subscription) });
  });

  app.post('/api/schedule/forget', (req, res) => {
    const { key } = req.body ?? {};
    if (!validKey(key)) return res.status(400).json({ error: 'bad_key' });
    store.forget(key);
    save();
    res.json({ ok: true });
  });

  const lastTest = new Map();
  app.post('/api/schedule/test', async (req, res) => {
    const { key, body } = req.body ?? {};
    const d = validKey(key) ? store.devices.get(key) : null;
    if (!d?.subscription) return res.status(404).json({ error: 'not_subscribed' });
    if (Date.now() - (lastTest.get(key) ?? 0) < 5000) return res.status(429).json({ error: 'too_fast' });
    lastTest.set(key, Date.now());
    const ok = await push(key, d.subscription, {
      id: `test-${Date.now()}`, kind: 'reminder', title: '🐾 FurryPal', at: Date.now(),
      body: typeof body === 'string' && body ? body.slice(0, 120) : '通知开好啦!到时间我会这样提醒你~',
    });
    res.status(ok ? 200 : 502).json({ ok });
  });

  const tick = async () => {
    const due = store.takeDue(Date.now());
    if (!due.length) return;
    save();
    await Promise.all(due.map(({ key, subscription, job }) => push(key, subscription, job)));
  };
  const timer = setInterval(() => { tick().catch(e => console.error('Schedule tick failed:', e.message)); }, TICK_MS);
  timer.unref?.();
  return { store, tick };
}
