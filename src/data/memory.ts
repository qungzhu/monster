/**
 * Long-term memory: what the pet remembers about its owner across sessions.
 *
 * Two extractors feed the same op format:
 *  - extractMemoriesLocally(): rule-based, offline, covers the common cases
 *    (name, birthday, job, likes/dislikes, upcoming events, goals, and the
 *    explicit "记住…" / "忘掉…" commands).
 *  - the server's /api/memory/extract (LLM) when an API key is configured.
 * Everything stays on the device; it is only sent to the AI as chat context.
 */

import { parseDue } from './time';

export type MemoryCategory = 'profile' | 'preference' | 'event' | 'relationship' | 'goal';

export interface Memory {
  id: string;
  text: string;
  category: MemoryCategory;
  /** Single-valued facts (name, birthday, job...) — a new value replaces the old. */
  slot?: string;
  source: 'auto' | 'manual' | 'ai';
  createdAt: number;
  updatedAt: number;
  /** For events: the pet already asked how it went. */
  followedUp?: boolean;
  /** For events: when it happens (ISO), so the pet can cheer and follow up on the day. */
  when?: string;
}

export type MemoryOp =
  | { op: 'add'; text: string; category: MemoryCategory; slot?: string; source?: Memory['source']; when?: string }
  | { op: 'update'; id: string; text: string }
  | { op: 'delete'; id: string };

export const MEMORY_LIMIT = 120;

export const memoryCategoryMeta: Record<MemoryCategory, { label: string; emoji: string }> = {
  profile: { label: '关于你', emoji: '🪪' },
  preference: { label: '喜好', emoji: '💗' },
  event: { label: '最近的事', emoji: '📅' },
  relationship: { label: '身边的人和宠物', emoji: '👨‍👩‍👧' },
  goal: { label: '目标', emoji: '🎯' },
};

// ———————————————— rule-based extraction ————————————————

const STOP = '[^，。,.!！？?；;~～\\s]';
const clean = (s: string) => s.trim().replace(/[了啦呀呢的哦嘛吧哈]+$/u, '').trim();

const JOBS = '学生|大学生|研究生|博士生|高中生|初中生|小学生|老师|教师|程序员|工程师|设计师|产品经理|医生|护士|律师|会计|销售|运营|主播|摄影师|厨师|司机|公务员|自由职业者|创业者|宝妈|全职妈妈|画师|作家|编辑|记者|警察|军人';
const EVENTS = '考试|期末考|期中考|面试|出差|旅行|旅游|体检|答辩|比赛|演出|搬家|开会|约会|婚礼|生日|手术|复试|考研|高考|中考|入职|报到';
const WHEN = '今天|明天|后天|大后天|这周末|周末|下周[一二三四五六日天]?|这周[一二三四五六日天]|周[一二三四五六日天]|下个月|月底|\\d{1,2}月\\d{1,2}[日号]?|[一二三四五六七八九十]{1,3}月[一二三四五六七八九十]{1,3}[日号]?';

/**
 * Explicit memory commands: "记住我对芒果过敏" / "忘掉考试的事" / "把X忘掉".
 * Anchored to the start of the sentence so "我忘记带伞了" is not a command.
 */
export function memoryCommand(raw: string, existing: Memory[]): { kind: 'remember' | 'forget'; ops: MemoryOp[] } | null {
  const text = raw.trim();
  const remember = text.match(/^(?:请|麻烦)?(?:你)?(?:帮我)?记住[：:，,\s]*(.{2,60})$/u);
  if (remember) {
    const v = clean(remember[1]).replace(/^我(?:的)?/u, '');
    return v.length >= 2 ? { kind: 'remember', ops: [{ op: 'add', text: v, category: guessCategory(v), source: 'manual' }] } : null;
  }
  const forget = text.match(/^(?:请|你)?(?:忘掉|忘了吧|忘记|别记|不要记|删掉|删除)(?:关于)?[「“"]?(.{1,20}?)[」”"]?(?:的事|这件事|这条)?[吧啦呀~～。！!]*$/u)
    ?? text.match(/^(?:请|你)?把[「“"]?(.{1,20}?)[」”"]?(?:的事|这件事|这条)?(?:忘掉|忘了吧|删掉)[吧啦呀~～。！!]*$/u);
  if (forget) {
    const key = clean(forget[1]);
    return { kind: 'forget', ops: existing.filter(m => key && m.text.includes(key)).map(m => ({ op: 'delete' as const, id: m.id })) };
  }
  return null;
}

/** Facts mentioned in passing (not commands — see memoryCommand). */
export function extractMemoriesLocally(raw: string, existing: Memory[], now = new Date()): MemoryOp[] {
  const text = raw.trim();
  const ops: MemoryOp[] = [];
  if (!text) return ops;
  const cmd = memoryCommand(text, existing);
  if (cmd) return cmd.ops;

  const add = (t: string, category: MemoryCategory, slot?: string) => {
    const v = clean(t);
    if (v.length >= 2) ops.push({ op: 'add', text: v, category, slot, source: 'auto' });
  };

  let m: RegExpMatchArray | null;
  if ((m = text.match(new RegExp(`我叫(${STOP}{1,8})`, 'u')))) add(`名字叫${clean(m[1])}`, 'profile', 'name');
  if ((m = text.match(/我(?:的)?生日(?:是|在)?\s*([0-9一二三四五六七八九十]{1,3}月[0-9一二三四五六七八九十]{1,3}[日号]?)/u))) add(`生日是${m[1]}`, 'profile', 'birthday');
  if ((m = text.match(new RegExp(`我是(?:一[名个位])?(${JOBS})`, 'u')))) add(`是${m[1]}`, 'profile', 'job');
  if ((m = text.match(new RegExp(`(?:^|我|[，,])在(${STOP}{2,14}?)(上班|工作|实习|读书|上学|念书)`, 'u')))) add(`在${m[1]}${m[2]}`, 'profile', m[2] === '上班' || m[2] === '工作' || m[2] === '实习' ? 'workplace' : 'school');
  if ((m = text.match(new RegExp(`我(?:今年)?(\\d{1,2})岁`, 'u')))) add(`今年${m[1]}岁`, 'profile', 'age');

  // Likes / dislikes (not "我喜欢你").
  if ((m = text.match(new RegExp(`我(?:最|超|特别|很|非常|好)?(?:喜欢|爱)(吃|喝|看|玩|听|去)?(${STOP}{1,12})`, 'u'))) && !/^你|^你们/u.test(m[2])) {
    add(`喜欢${m[1] ?? ''}${m[2]}`, 'preference');
  }
  if ((m = text.match(new RegExp(`我(?:很|超|特别|最)?(?:不喜欢|讨厌|害怕|怕|受不了)(吃|喝|看)?(${STOP}{1,12})`, 'u')))) {
    add(`不喜欢${m[1] ?? ''}${m[2]}`, 'preference');
  }

  // People and pets around them.
  if ((m = text.match(new RegExp(`我(?:家)?(?:有|养了)(?:一[只条个])?(${STOP}{1,6})(?:叫(${STOP}{1,6}))?`, 'u'))) && /猫|狗|兔|鼠|鸟|鱼|龟|宠物|孩子|女儿|儿子|妹妹|弟弟|姐姐|哥哥/u.test(m[1])) {
    add(`养了${m[1]}${m[2] ? `,叫${m[2]}` : ''}`, 'relationship');
  }
  if ((m = text.match(new RegExp(`我(?:的)?(男朋友|女朋友|老公|老婆|妈妈|爸爸|闺蜜|室友|同事|老板|朋友)(?:叫(${STOP}{1,6}))`, 'u')))) {
    add(`${m[1]}叫${m[2]}`, 'relationship', `rel-${m[1]}`);
  }

  // Upcoming events: "下周三要考试", "明天面试".
  if ((m = text.match(new RegExp(`(${WHEN})(?:我)?(?:要|得|有|去|参加)?(?:${STOP}{0,8}?)(${EVENTS})`, 'u')))) {
    add(`${m[1]}${m[2]}(${now.getMonth() + 1}月${now.getDate()}日说的)`, 'event');
    const when = parseDue(m[1], now)?.due;
    const last = ops[ops.length - 1];
    if (when && last?.op === 'add' && last.category === 'event') last.when = when;
  }

  // Goals.
  if ((m = text.match(new RegExp(`我(?:想|要|打算|准备|决定|正在)(减肥|健身|跑步|存钱|早睡|早起|戒烟|戒糖|学${STOP}{1,8}|考${STOP}{1,8})`, 'u')))) {
    add(`想${m[1]}`, 'goal');
  }

  return ops;
}

function guessCategory(t: string): MemoryCategory {
  if (/喜欢|爱|讨厌|不喜欢|怕/u.test(t)) return 'preference';
  if (new RegExp(EVENTS, 'u').test(t)) return 'event';
  if (/想|目标|计划|打算/u.test(t)) return 'goal';
  if (/妈|爸|朋友|老公|老婆|孩子|猫|狗/u.test(t)) return 'relationship';
  return 'profile';
}

// ———————————————— merging ————————————————

const norm = (s: string) => s.replace(/[\s，。,.!！？?(（)）]/gu, '');

/** Apply ops with de-duplication, slot replacement, and like/dislike conflicts. */
export function applyMemoryOps(list: Memory[], ops: MemoryOp[], now = Date.now()): { next: Memory[]; added: Memory[] } {
  let next = [...list];
  const added: Memory[] = [];
  for (const o of ops) {
    if (o.op === 'delete') { next = next.filter(m => m.id !== o.id); continue; }
    if (o.op === 'update') {
      next = next.map(m => (m.id === o.id ? { ...m, text: o.text.slice(0, 80), updatedAt: now } : m));
      continue;
    }
    const text = o.text.slice(0, 80);
    if (!text) continue;
    // Exact or contained duplicate: just refresh it.
    const dup = next.find(m => norm(m.text) === norm(text) || (m.category === o.category && (norm(m.text).includes(norm(text)) || norm(text).includes(norm(m.text)))));
    if (dup) {
      next = next.map(m => (m === dup ? { ...m, text: text.length > m.text.length ? text : m.text, updatedAt: now } : m));
      continue;
    }
    // A slot holds one value: replace (e.g. a new job).
    if (o.slot) next = next.filter(m => m.slot !== o.slot);
    // "不喜欢X" overrides "喜欢X" and vice versa.
    if (o.category === 'preference') {
      const core = text.replace(/^不?喜欢/u, '');
      next = next.filter(m => !(m.category === 'preference' && m.text.replace(/^不?喜欢/u, '') === core));
    }
    const mem: Memory = {
      id: `mem-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      category: o.category,
      slot: o.slot,
      source: o.source ?? 'auto',
      ...(o.when ? { when: o.when } : {}),
      createdAt: now,
      updatedAt: now,
    };
    next.push(mem);
    added.push(mem);
  }
  // Keep the newest within the limit (manual ones are kept preferentially).
  if (next.length > MEMORY_LIMIT) {
    const manual = next.filter(m => m.source === 'manual');
    const rest = next.filter(m => m.source !== 'manual').sort((a, b) => b.updatedAt - a.updatedAt);
    next = [...manual, ...rest].slice(0, MEMORY_LIMIT);
  }
  return { next, added };
}

// ———————————————— using memories ————————————————

/** Compact text block for the chat system prompt. */
export function memoryContext(list: Memory[], max = 40): string {
  if (!list.length) return '';
  const sorted = [...list].sort((a, b) => (b.source === 'manual' ? 1 : 0) - (a.source === 'manual' ? 1 : 0) || b.updatedAt - a.updatedAt).slice(0, max);
  const lines: string[] = [];
  for (const cat of Object.keys(memoryCategoryMeta) as MemoryCategory[]) {
    const items = sorted.filter(m => m.category === cat);
    if (items.length) lines.push(`【${memoryCategoryMeta[cat].label}】${items.map(m => m.text).join(';')}`);
  }
  return lines.join('\n');
}

/**
 * Something to follow up on: an event mentioned 1–14 days ago that the pet
 * hasn't asked about yet. Used by both the AI prompt and the offline replies.
 */
export function pendingFollowUp(list: Memory[], now = Date.now()): Memory | null {
  const DAY = 86_400_000;
  // Dated events: from 18:00 on the day. Undated: 1–14 days after mentioned.
  const startAt = (m: Memory) => (m.when ? followUpTime(m.when) : m.createdAt + DAY);
  return list
    .filter(m => m.category === 'event' && !m.followedUp && now >= startAt(m) && now - startAt(m) < 14 * DAY)
    .sort((a, b) => startAt(a) - startAt(b))[0] ?? null;
}

/** 18:00 local on the event's day — when the pet asks how it went. */
export function followUpTime(when: string): number {
  const d = new Date(when);
  d.setHours(18, 0, 0, 0);
  return d.getTime();
}

/** Offline flavour line that shows the pet remembers. */
export function recallLine(list: Memory[], now = Date.now()): { line: string; followUpId?: string } | null {
  const ev = pendingFollowUp(list, now);
  if (ev) return { line: `对了,你之前说「${ev.text.replace(/\s*\([^)]*说的\)/u, '')}」,后来怎么样啦?`, followUpId: ev.id };
  const prefs = list.filter(m => m.category === 'preference' && m.text.startsWith('喜欢'));
  if (prefs.length && Math.random() < 0.3) {
    const p = prefs[Math.floor(Math.random() * prefs.length)];
    return { line: `我记得你${p.text}~` };
  }
  return null;
}
