/**
 * Chinese date/time phrases → instants: "明天下午3点", "周五晚上8点半",
 * "下周三", "11月3号", "30分钟后", and repeats "每天早上8点", "工作日",
 * "每周一", "每月5号". Uses the device's local time zone.
 */
import { REPEATS, fromLocal, localParts, rollForward } from '../../shared/recurrence';
import type { Repeat } from '../../shared/recurrence';

export type { Repeat };
export { REPEATS };

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const CN_NUM: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cnToInt(s: string): number {
  if (/^\d+$/.test(s)) return Number(s);
  if (s === '十') return 10;
  if (s.startsWith('十')) return 10 + (CN_NUM[s[1]] ?? 0);
  if (s.includes('十')) return (CN_NUM[s[0]] ?? 0) * 10 + (CN_NUM[s[2]] ?? 0);
  return CN_NUM[s] ?? NaN;
}
const WEEKDAY: Record<string, number> = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
const NUM = '\\d{1,2}|[零一二两三四五六七八九十]{1,3}';

const TIME_RE = new RegExp(
  [
    `(\\d{1,2}|[一二三四五六七八九十]{1,3})(分钟|个?小时|个?钟头)(?:之|以)?后`,
    `大后天|后天|明天|今天|今晚|明早|明晚`,
    `下个?(?:周|星期|礼拜)[一二三四五六日天]|这个?(?:周|星期|礼拜)[一二三四五六日天]|(?:周|星期|礼拜)[一二三四五六日天]`,
    `(?:${NUM})月(?:${NUM})[日号]?`,
    `(?:早上|早晨|上午|中午|下午|傍晚|晚上|半夜)`,
    `(?:${NUM})(?:[:：]\\d{2}|点(?:半|一刻|三刻|(?:${NUM})分?)?)`,
  ].join('|'),
  'gu',
);

/**
 * Find a due time in the text. Returns the ISO time and the text with the
 * time words removed (for a clean title), or null when no time is given.
 * A day without a clock time means 9:00 that day.
 */
export function parseDue(text: string, now = new Date()): { due: string; rest: string } | null {
  const d = new Date(now);
  let dayHit = false, clockHit = false;
  let hour = 9, minute = 0, period = '';

  for (const m of text.matchAll(TIME_RE)) {
    const t = m[0];
    if (m[1]) {
      const n = cnToInt(m[1]);
      if (!Number.isFinite(n)) continue;
      const ms = m[2] === '分钟' ? n * 60_000 : n * 3_600_000;
      return { due: new Date(now.getTime() + ms).toISOString(), rest: cleanTitle(text.replace(t, '')) };
    }
    if (/^(?:今天|今晚|明天|明早|明晚|后天|大后天)$/.test(t)) {
      d.setDate(now.getDate() + ({ 今天: 0, 今晚: 0, 明天: 1, 明早: 1, 明晚: 1, 后天: 2, 大后天: 3 } as Record<string, number>)[t]);
      if (t.endsWith('晚')) period = '晚上';
      if (t === '明早') period = '早上';
      dayHit = true;
    } else if (/(?:周|星期|礼拜)[一二三四五六日天]$/.test(t)) {
      // Weeks start on Monday: 周一=1 … 周日=7.
      const target = WEEKDAY[t.slice(-1)] || 7, today = now.getDay() || 7;
      let diff = t.startsWith('下') ? 7 - today + target : target - today;
      if (diff < 0) diff += 7; // 周X already passed this week → the coming one
      d.setDate(now.getDate() + diff);
      dayHit = true;
    } else if (/月/.test(t)) {
      const [mo, da] = t.replace(/[日号]$/, '').split('月').map(cnToInt);
      if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
        d.setMonth(mo - 1, da);
        if (d.getTime() < now.getTime() - 86_400_000) d.setFullYear(d.getFullYear() + 1);
        dayHit = true;
      }
    } else if (/^(?:早上|早晨|上午|中午|下午|傍晚|晚上|半夜)$/.test(t)) {
      period = t;
    } else {
      const hm = t.match(new RegExp(`^(${NUM})(?:[:：](\\d{2})|点(半|一刻|三刻|(${NUM})分?)?)$`, 'u'));
      if (!hm) continue;
      hour = cnToInt(hm[1]);
      minute = hm[2] ? Number(hm[2]) : hm[3] === '半' ? 30 : hm[3] === '一刻' ? 15 : hm[3] === '三刻' ? 45 : hm[4] ? cnToInt(hm[4]) : 0;
      clockHit = true;
    }
  }
  if (!dayHit && !clockHit && !period) return null;

  if (!clockHit) hour = ({ 早上: 8, 早晨: 8, 上午: 10, 中午: 12, 下午: 15, 傍晚: 18, 晚上: 20, 半夜: 23 } as Record<string, number>)[period] ?? 9;
  else if (/下午|傍晚|晚上|今晚|明晚/.test(period) && hour < 12) hour += 12;
  else if (period === '中午' && hour < 6) hour += 12;
  if (!Number.isFinite(hour) || hour > 23 || minute > 59) return null;
  d.setHours(hour, minute, 0, 0);
  // "3点提醒我" said at 16:00 without a day means tomorrow.
  if (!dayHit && d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return { due: d.toISOString(), rest: cleanTitle(text.replace(TIME_RE, '')) };
}

/** Strip request words ("提醒我", "帮我"…) so what's left is a title. */
export function cleanTitle(s: string) {
  return s
    .replace(/^[\s，,。]*(?:请|麻烦)?(?:你)?(?:帮我|给我)?(?:提醒我?|提醒一下|记得|别忘了|记一下|添加待办|待办|安排)?[\s:：，,]*/u, '')
    .replace(/(?:的时候)?(?:提醒我|叫我|喊我)/u, '')
    .replace(/^[要去得]\s*/u, '')
    .replace(/[\s，,。！!~～吧哦呀啦]+$/u, '')
    .trim();
}

const REPEAT_RE = /每天|每日|天天|每晚|每早|每个?工作日|工作日|周一到周五|每个?(?:周|星期|礼拜)[一二三四五六日天]|每个?月(?:\d{1,2}|[一二三四五六七八九十]{1,3})[日号]/u;

export const repeatLabel: Record<Repeat, string> = { daily: '每天', weekdays: '工作日', weekly: '每周', monthly: '每月' };

/**
 * A repeating reminder: returns the repeat kind, its next occurrence and the
 * text without time words, or null when the text has no repeat phrase.
 */
export function parseRepeat(text: string, now = new Date(), tz = localTimeZone()): { repeat: Repeat; due: string; rest: string } | null {
  const m = text.match(REPEAT_RE);
  if (!m) return null;
  const phrase = m[0];
  const repeat: Repeat = /工作日|周一到周五/.test(phrase) ? 'weekdays' : /周|星期|礼拜/.test(phrase) ? 'weekly' : /月/.test(phrase) ? 'monthly' : 'daily';
  // Keep the weekday ("每周三" → "周三") so parseDue finds the next one.
  const keep = repeat === 'weekly' ? phrase.replace(/^每个?/, '') : phrase === '每晚' ? '晚上' : phrase === '每早' ? '早上' : '';
  const timeText = text.replace(phrase, keep);
  const parsed = parseDue(timeText, now);
  let at: number;
  if (repeat === 'monthly') {
    const day = cnToInt(phrase.match(/月(.+)[日号]/u)![1]);
    if (!(day >= 1 && day <= 31)) return null;
    const clock = parsed ? new Date(parsed.due) : null;
    const p = localParts(now.getTime(), tz);
    at = fromLocal(p.y, p.mo, Math.min(day, new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate()), clock ? clock.getHours() : 9, clock ? clock.getMinutes() : 0, tz);
  } else if (parsed) {
    at = Date.parse(parsed.due);
  } else {
    const d = new Date(now); d.setHours(9, 0, 0, 0); at = d.getTime();
  }
  at = rollForward(at, repeat, tz, now.getTime());
  return { repeat, due: new Date(at).toISOString(), rest: cleanTitle((parsed ? parsed.rest : timeText).replace(REPEAT_RE, '')) };
}

/** Remove date/time phrases ("下周三", "明天下午3点") from a text. */
export function stripTimeWords(text: string): string {
  return text.replace(TIME_RE, '').replace(REPEAT_RE, '').trim();
}
