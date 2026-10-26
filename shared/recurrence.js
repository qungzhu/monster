/**
 * Repeating schedules that keep their local wall-clock time ("every day at
 * 08:00 in Asia/Shanghai"), shared by the browser and the Node scheduler.
 * Pure, no dependencies; time zones via Intl.
 */

export const REPEATS = ['daily', 'weekdays', 'weekly', 'monthly'];

const fmtCache = new Map();
function formatter(tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

/** Wall-clock parts of an instant in a time zone. */
export function localParts(ms, tz) {
  const p = {};
  for (const { type, value } of formatter(tz).formatToParts(new Date(ms))) p[type] = Number(value);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second, dow };
}

function offsetAt(ms, tz) {
  const p = localParts(ms, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Instant of a local wall-clock time (day may overflow; it is normalised). */
export function fromLocal(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = offsetAt(guess, tz);
  let ms = guess - off;
  const off2 = offsetAt(ms, tz);
  if (off2 !== off) ms = guess - off2;
  return ms;
}

/** The occurrence after `atMs`, same local time of day. */
export function nextOccurrence(atMs, repeat, tz) {
  const p = localParts(atMs, tz);
  switch (repeat) {
    case 'daily': return fromLocal(p.y, p.mo, p.d + 1, p.h, p.mi, tz);
    case 'weekly': return fromLocal(p.y, p.mo, p.d + 7, p.h, p.mi, tz);
    case 'weekdays': {
      const skip = p.dow === 5 ? 3 : p.dow === 6 ? 2 : 1; // Fri → Mon, Sat → Mon
      return fromLocal(p.y, p.mo, p.d + skip, p.h, p.mi, tz);
    }
    case 'monthly': {
      const days = new Date(Date.UTC(p.y, p.mo + 1, 0)).getUTCDate(); // length of next month
      return fromLocal(p.y, p.mo + 1, Math.min(p.d, days), p.h, p.mi, tz);
    }
    default: return NaN;
  }
}

/** First occurrence strictly after `nowMs` (catches up on missed ones). */
export function rollForward(atMs, repeat, tz, nowMs) {
  let at = atMs;
  if (repeat === 'weekdays') {
    const p = localParts(at, tz);
    if (p.dow === 0 || p.dow === 6) at = nextOccurrence(at, repeat, tz);
  }
  for (let i = 0; at <= nowMs && i < 2000; i++) at = nextOccurrence(at, repeat, tz);
  return at;
}
