/**
 * What the pet will say on its own, and when: reminders for due items,
 * a morning greeting, cheering on the day of an important event and asking
 * how it went that evening, and "I miss you" after two days away. Pure: the
 * same list drives the in-app preview and the server sync.
 */
import type { LifeItem } from '../data/companion';
import type { Memory } from '../data/memory';
import { fromLocal, localParts, rollForward } from '../../shared/recurrence';
import type { Repeat } from '../../shared/recurrence';
import { stripTimeWords } from '../data/time';

export type JobKind = 'reminder' | 'morning' | 'event-day' | 'event-followup' | 'miss-you';

export interface Job {
  id: string;
  kind: JobKind;
  /** Epoch ms. */
  at: number;
  repeat?: Repeat;
  title: string;
  body: string;
}

export interface ProactiveSettings {
  morning: boolean;
  /** "HH:MM" local time. */
  morningTime: string;
  eventCare: boolean;
  missYou: boolean;
}

export const defaultProactive: ProactiveSettings = { morning: true, morningTime: '08:30', eventCare: true, missYou: true };

/** One-off reminders this late are not sent any more. */
const STALE_MS = 6 * 3_600_000;

function hm(time: string): [number, number] {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  const h = m ? Math.min(23, Number(m[1])) : 8, mi = m ? Math.min(59, Number(m[2])) : 30;
  return [h, mi];
}

/** Text of an event memory without "(10月22日说的)" and relative time words. */
export function eventName(m: Memory): string {
  return stripTimeWords(m.text.replace(/\s*\([^)]*说的\)/u, '')) || m.text;
}

export function buildJobs(opts: {
  items: LifeItem[];
  memories: Memory[];
  settings: ProactiveSettings;
  petName: string;
  now: number;
  tz: string;
}): Job[] {
  const { items, memories, settings, petName, now, tz } = opts;
  const jobs: Job[] = [];
  const today = localParts(now, tz);
  const [mh, mm] = hm(settings.morningTime);

  for (const it of items) {
    if (!it.due || it.completed || (!it.repeat && it.remindedAt)) continue;
    const at = Date.parse(it.due);
    if (!Number.isFinite(at) || (!it.repeat && at < now - STALE_MS)) continue;
    jobs.push({ id: `r:${it.id}`, kind: 'reminder', at, repeat: it.repeat, title: `⏰ ${petName}提醒你`, body: it.title });
  }

  if (settings.morning) {
    const first = rollForward(fromLocal(today.y, today.mo, today.d, mh, mm, tz), 'daily', tz, now);
    jobs.push({
      id: 'morning', kind: 'morning', at: first, repeat: 'daily', title: `☀️ ${petName}`,
      body: `早安!新的一天开始啦,有什么要我帮你记着的就跟我说~`,
    });
  }

  if (settings.eventCare) {
    for (const m of memories) {
      if (m.category !== 'event' || !m.when || m.followedUp) continue;
      const w = localParts(Date.parse(m.when), tz);
      const name = eventName(m);
      const cheerAt = fromLocal(w.y, w.mo, w.d, mh, mm, tz);
      // Cheer before the event (and never after it has started).
      if (cheerAt > now && cheerAt < Date.parse(m.when) + 60_000) {
        jobs.push({ id: `cheer:${m.id}`, kind: 'event-day', at: cheerAt, title: `💪 ${petName}`, body: `今天就是「${name}」的日子啦!深呼吸,你一定可以的~` });
      }
      const askAt = fromLocal(w.y, w.mo, w.d, 18, 0, tz); // same as followUpTime(), in `tz`
      if (askAt > now) {
        jobs.push({ id: `ask:${m.id}`, kind: 'event-followup', at: askAt, title: `💬 ${petName}`, body: `今天的「${name}」怎么样?回来跟我说说吧~` });
      }
    }
  }

  if (settings.missYou) {
    // Two days from now, in the evening.
    const p = localParts(now + 2 * 86_400_000, tz);
    jobs.push({ id: 'miss-you', kind: 'miss-you', at: fromLocal(p.y, p.mo, p.d, 19, 0, tz), title: `🥺 ${petName}`, body: `好想你呀…已经两天没见到你了,来看看我好不好?` });
  }

  return jobs.sort((a, b) => a.at - b.at);
}
