/**
 * Server-side schedule for offline reminders and proactive messages. The
 * browser is the source of truth: it computes its upcoming jobs and syncs
 * the whole list; this store only keeps them, says what's due, and
 * advances repeating jobs. Pure (no I/O) so it's easy to test and to move
 * to another runtime.
 */
import { REPEATS, rollForward } from '../shared/recurrence.js';

export const JOB_KINDS = ['reminder', 'morning', 'event-day', 'event-followup', 'miss-you'];
export const MAX_JOBS = 200;
/** A one-off job this late (server was down) is dropped rather than sent. */
export const STALE_MS = 6 * 3_600_000;
const FIRED_TTL = 3 * 86_400_000;
const DAY = 86_400_000;

/** Push services we're willing to POST to (no arbitrary URLs: SSRF). */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/,
  /\.push\.apple\.com$/, /\.notify\.windows\.com$/,
];

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function validTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { return 'UTC'; }
}

export function validSubscription(sub, allowAnyEndpoint = false) {
  if (!sub || typeof sub !== 'object') return null;
  let url;
  try { url = new URL(sub.endpoint); } catch { return null; }
  if (!allowAnyEndpoint && (url.protocol !== 'https:' || !PUSH_HOSTS.some(re => re.test(url.hostname)))) return null;
  const p256dh = str(sub.keys?.p256dh, 200), auth = str(sub.keys?.auth, 100);
  if (!p256dh || !auth || String(sub.endpoint).length > 1000) return null;
  return { endpoint: String(sub.endpoint), keys: { p256dh, auth } };
}

export const validKey = key => typeof key === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(key);

function cleanJobs(jobs, now) {
  const out = [];
  const ids = new Set();
  for (const j of Array.isArray(jobs) ? jobs.slice(0, MAX_JOBS) : []) {
    const id = str(j?.id, 80);
    const at = Number(j?.at);
    if (!id || ids.has(id) || !JOB_KINDS.includes(j.kind) || !Number.isFinite(at)) continue;
    if (at < now - 7 * DAY || at > now + 400 * DAY) continue;
    const body = str(j.body, 200);
    if (!body) continue;
    ids.add(id);
    out.push({
      id, kind: j.kind, at, title: str(j.title, 60) || 'FurryPal', body,
      ...(REPEATS.includes(j.repeat) ? { repeat: j.repeat } : {}),
    });
  }
  return out;
}

export class ScheduleStore {
  constructor(data = {}, { allowAnyEndpoint = false } = {}) {
    this.devices = new Map(Object.entries(data.devices ?? {}));
    this.allowAnyEndpoint = allowAnyEndpoint;
  }

  /** Replace a device's jobs. Returns false for a bad key. */
  sync(key, { subscription, tz, jobs } = {}, now = Date.now()) {
    if (!validKey(key)) return false;
    const prev = this.devices.get(key);
    const fired = Object.fromEntries(Object.entries(prev?.fired ?? {}).filter(([, t]) => now - t < FIRED_TTL));
    const zone = validTimeZone(tz);
    const list = cleanJobs(jobs, now)
      // A one-off already sent (the client may not know yet) isn't sent twice.
      .filter(j => j.repeat || !fired[`${j.id}@${j.at}`])
      .map(j => (j.repeat && j.at <= now - STALE_MS ? { ...j, at: rollForward(j.at, j.repeat, zone, now) } : j));
    this.devices.set(key, {
      subscription: validSubscription(subscription, this.allowAnyEndpoint) ?? prev?.subscription ?? null,
      tz: zone,
      jobs: list,
      fired,
      updatedAt: now,
    });
    return true;
  }

  forget(key) {
    return this.devices.delete(key);
  }

  dropSubscription(key) {
    const d = this.devices.get(key);
    if (d) d.subscription = null;
  }

  /**
   * Take everything due: returns what to send, and advances the store
   * (repeating jobs move to their next time, one-offs are removed).
   * Stale jobs are skipped without sending.
   */
  takeDue(now = Date.now()) {
    const send = [];
    for (const [key, d] of this.devices) {
      const keep = [];
      for (const j of d.jobs) {
        if (j.at > now) { keep.push(j); continue; }
        const stale = now - j.at > STALE_MS;
        if (!stale && d.subscription) send.push({ key, subscription: d.subscription, job: { id: j.id, kind: j.kind, title: j.title, body: j.body, at: j.at } });
        if (j.repeat) keep.push({ ...j, at: rollForward(j.at, j.repeat, d.tz, now) });
        else d.fired[`${j.id}@${j.at}`] = now;
      }
      d.jobs = keep;
    }
    return send;
  }

  /** Soonest job time, for logging/tests. */
  nextAt() {
    let t = Infinity;
    for (const d of this.devices.values()) for (const j of d.jobs) t = Math.min(t, j.at);
    return t;
  }

  toJSON() {
    return { devices: Object.fromEntries(this.devices) };
  }
}
