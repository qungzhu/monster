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
import { REPEATS, cleanTitle as clean, parseDue, parseRepeat, repeatLabel } from './time';
import type { Repeat } from './time';

export { parseDue, parseRepeat };

export type AgentAction =
  | { type: 'add_item'; itemType: LifeItemType; title: string; due?: string; repeat?: Repeat }
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
  const rep = parseRepeat(text, now);
  if (rep && rep.rest) return { type: 'add_item', itemType: life?.type === 'study' ? 'study' : 'todo', title: rep.rest, due: rep.due, repeat: rep.repeat };
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
  const clauses = text.split(/[，,；;。]\s*(?=然后|再|还有|并且|另外|顺便|以及)|(?:然后|还有|并且|另外|顺便|以及)|[；;。]/u).map(s => s?.trim().replace(/^(?:然后|再|还有|并且|另外|顺便|以及)/u, '')).filter(Boolean) as string[];
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
        const due = isoOrUndef(o.due);
        const repeat = due && REPEATS.includes(o.repeat as Repeat) ? (o.repeat as Repeat) : undefined;
        if (title) actions.push({ type: 'add_item', itemType, title, due, ...(repeat ? { repeat } : {}) });
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

/** "每天 08:00", "每周三 20:00", "每月5号 09:00", "工作日 08:30". */
export function formatRepeat(iso: string, repeat: Repeat): string {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (repeat === 'weekly') return `每周${'日一二三四五六'[d.getDay()]} ${hm}`;
  if (repeat === 'monthly') return `每月${d.getDate()}号 ${hm}`;
  return `${repeatLabel[repeat]} ${hm}`;
}

/** Icon + one-line description for the confirmation card. */
export function describeAction(a: AgentAction, now = new Date()): { icon: string; text: string } {
  switch (a.type) {
    case 'add_item': return { icon: lifeItemMeta[a.itemType].emoji, text: `新建${lifeItemMeta[a.itemType].label}「${a.title}」${a.due ? `,${a.repeat ? formatRepeat(a.due, a.repeat) : formatDue(a.due, now)} 提醒你` : ''}` };
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
