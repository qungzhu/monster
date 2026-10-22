// Friendship ("好感") between players' cats in the shared plaza.
//
// Server-authoritative on purpose: clients only ever *receive* bond points,
// so nobody can award themselves friendship. Bonds are keyed by each
// player's private device key (never broadcast), so they survive reconnects
// and session ids. Pure logic, no I/O: the host loads a snapshot and is told
// when to persist (server/plaza.js -> JSON file; a Durable Object / D1 can
// do the same later).

export const BOND_LEVELS = [
  { min: 0, name: '陌生猫猫', badge: '' },
  { min: 10, name: '点头之交', badge: '🤝' },
  { min: 30, name: '好朋友', badge: '💛' },
  { min: 60, name: '好闺蜜', badge: '💖' },
  { min: 100, name: '形影不离', badge: '💞' },
];

export const BOND_POINTS = { rub: 3, play: 5 };
export const DAILY_PAIR_CAP = 20;   // per pair per day: no farming by spamming invites

export const levelOf = total => {
  let i = 0;
  for (let k = 0; k < BOND_LEVELS.length; k++) if (total >= BOND_LEVELS[k].min) i = k;
  return i;
};

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const today = now => new Date(now).toISOString().slice(0, 10);

export class BondStore {
  /**
   * @param {{pairs?: object, names?: object}} [snapshot] previously saved toJSON()
   * @param {() => void} [onChange] called after every mutation (debounce it)
   */
  constructor(snapshot = {}, onChange = () => {}) {
    this.pairs = new Map(Object.entries(snapshot.pairs ?? {}));   // pairKey -> { total, day, dayPoints }
    this.names = new Map(Object.entries(snapshot.names ?? {}));   // playerKey -> { name, petName }
    this.onChange = onChange;
  }

  toJSON() {
    return { pairs: Object.fromEntries(this.pairs), names: Object.fromEntries(this.names) };
  }

  remember(key, name, petName) {
    this.names.set(key, { name, petName });
    this.onChange();
  }

  total(a, b) {
    return this.pairs.get(pairKey(a, b))?.total ?? 0;
  }

  /** Points this pair can still earn today (resets at UTC midnight). */
  todayLeft(a, b, now = Date.now()) {
    const rec = this.pairs.get(pairKey(a, b));
    if (!rec || rec.day !== today(now)) return DAILY_PAIR_CAP;
    return Math.max(0, DAILY_PAIR_CAP - rec.dayPoints);
  }

  /** Award points for a completed interaction, respecting the daily cap. */
  award(a, b, kind, now = Date.now()) {
    const k = pairKey(a, b);
    const rec = this.pairs.get(k) ?? { total: 0, day: today(now), dayPoints: 0 };
    if (rec.day !== today(now)) { rec.day = today(now); rec.dayPoints = 0; }
    const before = rec.total;
    const gained = Math.max(0, Math.min(BOND_POINTS[kind] ?? 0, DAILY_PAIR_CAP - rec.dayPoints));
    rec.total += gained;
    rec.dayPoints += gained;
    this.pairs.set(k, rec);
    this.onChange();
    return { gained, total: rec.total, capped: gained < (BOND_POINTS[kind] ?? 0), levelUp: levelOf(rec.total) > levelOf(before) };
  }

  /** All friends of a player, strongest first. */
  listFor(key) {
    const out = [];
    for (const [k, rec] of this.pairs) {
      const [x, y] = k.split('|');
      if (x !== key && y !== key) continue;
      const other = x === key ? y : x;
      if (rec.total <= 0) continue;
      out.push({ key: other, total: rec.total, ...(this.names.get(other) ?? { name: '?', petName: '?' }) });
    }
    return out.sort((p, q) => q.total - p.total).slice(0, 50);
  }
}
