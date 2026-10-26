/**
 * Task agent: turn a request ("明天下午3点提醒我取快递，再记一下体重60")
 * into a short list of concrete actions the owner confirms before anything
 * runs. Two planners produce the same AgentPlan:
 *  - planLocally(): rule-based, offline
 *  - the server's /api/agent/plan (LLM) when an API key is configured
 * Every plan — especially the LLM's — goes through normalizePlan() so only
 * known actions on known items can execute.
 */
import { companionRoles, lifeItemMeta, parseLifeCommand } from './companion';
import type { CompanionRole, LifeItem, LifeItemType } from './companion';
import { memoryCategoryMeta } from './memory';
import type { MemoryCategory } from './memory';

export type AgentAction =
  | { type: 'add_item'; itemType: LifeItemType; title: string; due?: string }
  | { type: 'complete_item'; id: string; title: string }
  | { type: 'remove_item'; id: string; title: string }
  | { type: 'calendar_event'; summary: string; start: string; end: string }
  | { type: 'remember'; text: string; category: MemoryCategory }
  | { type: 'set_role'; role: CompanionRole };

export interface AgentPlan {
  command: string;
  /** One line in the pet's voice: "好,我帮你做这两件事:" */
  reply: string;
  actions: AgentAction[];
}

export const MAX_ACTIONS = 6;

// ———————————————— is this a task? ————————————————

const TASK_HINT = /提醒我|提醒一下|帮我|记得|别忘了|(?:添加|加个|新建|加一?条)待办|快递|取件|包裹|体重|复习|背单词|刷题|安排|日程|日历|会议|开会|预约|完成了?|做完了?|搞定了?|取到了|删掉|删除|划掉|取消.{0,6}(?:待办|提醒|事项)|当我的|切换成?|变成我的/;

/** Cheap pre-check so ordinary chat never pays for planning. */
export function looksLikeTask(text: string): boolean {
  return TASK_HINT.test(text);
}

// ———————————————— time parsing ————————————————

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
      return { due: new Date(now.getTime() + ms).toISOString(), rest: clean(text.replace(t, '')) };
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
  return { due: d.toISOString(), rest: clean(text.replace(TIME_RE, '')) };
}

function clean(s: string) {
  return s
    .replace(/^[\s，,。]*(?:请|麻烦)?(?:你)?(?:帮我|给我)?(?:提醒我?|提醒一下|记得|别忘了|记一下|添加待办|待办|安排)?[\s:：，,]*/u, '')
    .replace(/(?:的时候)?(?:提醒我|叫我|喊我)/u, '')
    .replace(/^[要去得]\s*/u, '')
    .replace(/[\s，,。！!~～吧哦呀啦]+$/u, '')
    .trim();
}

// ———————————————— local planner ————————————————

/** Best pending item whose title shares the most characters with the text. */
function findItem(items: LifeItem[], hint: string, pendingOnly: boolean): LifeItem | null {
  const h = hint.replace(/[的了吧啦\s]/gu, '');
  if (h.length < 1) return null;
  let best: LifeItem | null = null, bestScore = 0;
  for (const it of items) {
    if (pendingOnly && it.completed) continue;
    const t = it.title;
    const score = t.includes(h) || h.includes(t) ? 100 + Math.min(t.length, h.length) : [...new Set(h)].filter(ch => t.includes(ch)).length / Math.max(h.length, 1) * 50;
    if (score > bestScore) { best = it; bestScore = score; }
  }
  return bestScore >= 30 ? best : null;
}

function planClause(raw: string, items: LifeItem[], now: Date): AgentAction | null {
  const text = raw.trim();
  if (!text) return null;
  let m: RegExpMatchArray | null;

  if ((m = text.match(/(?:当|做|切换成?|变成|换成)(?:我的)?(朋友|管家|助手|老师)/u))) {
    const role = (Object.keys(companionRoles) as CompanionRole[]).find(r => companionRoles[r].label === m![1]);
    if (role) return { type: 'set_role', role };
  }

  if ((m = text.match(/^(?:我)?(?:已经)?(?:完成了?|做完了?|搞定了?|划掉|勾掉)(.+)$/u)) || (m = text.match(/^(?:我)?(?:已经)?(.+?)(?:做完了|完成了|搞定了|取到了|取了|拿到了|弄好了|完了)$/u))) {
    const it = m[1].length >= 2 ? findItem(items, m[1], true) : null;
    if (it) return { type: 'complete_item', id: it.id, title: it.title };
  }
  if ((m = text.match(/^(?:帮我)?(?:删掉|删除|取消|不用)(?:待办|提醒|事项)?[「“"]?(.+?)[」”"]?(?:这个|这条)?(?:待办|提醒|事项)?(?:了)?$/u))) {
    const it = findItem(items, m[1], false);
    if (it) return { type: 'remove_item', id: it.id, title: it.title };
  }

  const life = parseLifeCommand(text);
  const due = parseDue(text, now);
  if (life?.type === 'weight') return { type: 'add_item', itemType: 'weight', title: life.title };
  if (life || (due && /提醒|记得|别忘|要|去|日程|日历|会议|开会|预约/.test(text))) {
    const itemType: LifeItemType = life?.type ?? 'todo';
    const title = clean(due ? due.rest : (life?.title ?? text)) || clean(text);
    if (title.length < 1) return null;
    if (due && /日历|日程|会议|开会|预约/.test(text)) {
      const start = due.due;
      return { type: 'calendar_event', summary: title.replace(/[，,]?\s*(?:加到|添加到|写入|放到|加入|记到|记在)?(?:我的)?(?:Google)?(?:日历|日程)(?:里|中|上)?/giu, '').trim() || title, start, end: new Date(new Date(start).getTime() + 3_600_000).toISOString() };
    }
    return { type: 'add_item', itemType, title, due: due?.due };
  }
  return null;
}

/** Offline planner: split compound requests, plan each clause. */
export function planLocally(text: string, items: LifeItem[], now = new Date()): AgentPlan | null {
  const clauses = text.split(/[，,；;。]\s*(?=然后|再|还有|并且|另外|顺便|以及)|(?:然后|还有|并且|另外|顺便|以及)|[；;。]/u).map(s => s?.trim()).filter(Boolean) as string[];
  let actions = clauses.map(c => planClause(c, items, now)).filter(Boolean) as AgentAction[];
  // A single clause the splitter broke apart badly: try the whole sentence.
  if (!actions.length) actions = [planClause(text, items, now)].filter(Boolean) as AgentAction[];
  if (!actions.length) return null;
  return { command: text, reply: actions.length > 1 ? `好,我帮你做这 ${actions.length} 件事:` : '好,我帮你做这件事:', actions: actions.slice(0, MAX_ACTIONS) };
}

// ———————————————— validation & display ————————————————

const ROLES = Object.keys(companionRoles) as CompanionRole[];
const ITEM_TYPES = Object.keys(lifeItemMeta) as LifeItemType[];
const MEMORY_CATS = Object.keys(memoryCategoryMeta) as MemoryCategory[];
const str = (v: unknown, n = 60) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const isoOrUndef = (v: unknown) => {
  if (typeof v !== 'string' || !v) return undefined;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
};

/**
 * Keep only well-formed actions on items that exist. Calendar writes are
 * turned into to-dos when the calendar isn't connected.
 */
export function normalizePlan(raw: unknown, command: string, items: LifeItem[], calendarConnected: boolean): AgentPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { reply?: unknown; actions?: unknown };
  const byId = new Map(items.map(i => [i.id, i]));
  const actions: AgentAction[] = [];
  for (const a of Array.isArray(r.actions) ? r.actions.slice(0, MAX_ACTIONS) : []) {
    if (!a || typeof a !== 'object') continue;
    const o = a as Record<string, unknown>;
    switch (o.type) {
      case 'add_item': {
        const title = str(o.title);
        const itemType = ITEM_TYPES.includes(o.itemType as LifeItemType) ? (o.itemType as LifeItemType) : 'todo';
        if (title) actions.push({ type: 'add_item', itemType, title, due: isoOrUndef(o.due) });
        break;
      }
      case 'complete_item': case 'remove_item': {
        const it = byId.get(str(o.id, 80));
        if (it) actions.push({ type: o.type, id: it.id, title: it.title });
        break;
      }
      case 'calendar_event': {
        const summary = str(o.summary), start = isoOrUndef(o.start);
        if (!summary || !start) break;
        const end = isoOrUndef(o.end) ?? new Date(Date.parse(start) + 3_600_000).toISOString();
        actions.push(calendarConnected ? { type: 'calendar_event', summary, start, end } : { type: 'add_item', itemType: 'todo', title: summary, due: start });
        break;
      }
      case 'remember': {
        const text = str(o.text, 80);
        if (text) actions.push({ type: 'remember', text, category: MEMORY_CATS.includes(o.category as MemoryCategory) ? (o.category as MemoryCategory) : 'profile' });
        break;
      }
      case 'set_role':
        if (ROLES.includes(o.role as CompanionRole)) actions.push({ type: 'set_role', role: o.role as CompanionRole });
        break;
    }
  }
  if (!actions.length) return null;
  return { command, reply: str(r.reply, 80) || (actions.length > 1 ? `好,我帮你做这 ${actions.length} 件事:` : '好,我帮你做这件事:'), actions };
}

export function formatDue(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - day0.getTime()) / 86_400_000);
  const day = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Icon + one-line description for the confirmation card. */
export function describeAction(a: AgentAction, now = new Date()): { icon: string; text: string } {
  switch (a.type) {
    case 'add_item': return { icon: lifeItemMeta[a.itemType].emoji, text: `新建${lifeItemMeta[a.itemType].label}「${a.title}」${a.due ? `,${formatDue(a.due, now)} 提醒你` : ''}` };
    case 'complete_item': return { icon: '☑️', text: `把「${a.title}」标记为完成` };
    case 'remove_item': return { icon: '🗑️', text: `删除「${a.title}」` };
    case 'calendar_event': return { icon: '📅', text: `写入 Google 日历:${formatDue(a.start, now)}「${a.summary}」` };
    case 'remember': return { icon: '🧠', text: `记住:${a.text}` };
    case 'set_role': return { icon: companionRoles[a.role].emoji, text: `切换成你的${companionRoles[a.role].label}` };
  }
}

/** Natural-language replies while a plan waits for confirmation. */
export const CONFIRM_RE = /^(?:好的?|好呀|好啊|行|可以|确认|确定|执行|没问题|对|嗯嗯?|ok|okay|yes|go|做吧|就这样)[!！。~～吧呀啊]*$/iu;
export const CANCEL_RE = /^(?:算了|不用了?|取消|不要了?|别了|先不|不对|no)[!！。~～吧呀啊]*$/iu;
