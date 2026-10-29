import { getBreed, rarityLabels } from '../data/breeds';
import { BOND_LEVELS, DAILY_PAIR_CAP, INTERACT_PROMPT_RADIUS, nextLevelMin } from './protocol';
import type { InteractKind, Peer, PlazaAction } from './protocol';

const ACTION_LABEL: Record<PlazaAction, string> = {
  Idle: '发呆中', Walk: '散步中', Run: '奔跑中', Scratch: '舔爪子', Eat: '吃饭中',
  Sleep: '睡觉中 💤', Meow: '喵喵叫', Happy: '开心中 💕',
};

interface Props {
  peer: Peer;
  isSelf: boolean;
  action: PlazaAction;
  distance: number | null;               // to my cat, null for my own card
  bond?: { total: number; level: number; todayLeft: number };
  friendCount: number;                   // shown on my own card
  busy: boolean;                         // I'm mid-interaction
  pending: boolean;                      // I already invited this cat
  onInvite: (kind: InteractKind) => void;
  onWalkTo: () => void;
  onClose: () => void;
}

/** Profile card for a cat in the plaza: breed, owner, and your bond. */
export function PetCard({ peer, isSelf, action, distance, bond, friendCount, busy, pending, onInvite, onWalkTo, onClose }: Props) {
  const breed = getBreed(peer.breed);
  const rarity = breed ? rarityLabels[breed.rarity] : null;
  const b = bond ?? { total: 0, level: 0, todayLeft: DAILY_PAIR_CAP };
  const lvl = BOND_LEVELS[b.level];
  const lo = lvl.min, hi = nextLevelMin(b.level);
  const pct = hi ? Math.round(((b.total - lo) / (hi - lo)) * 100) : 100;
  const near = distance !== null && distance <= INTERACT_PROMPT_RADIUS;

  return (
    <div className="absolute inset-x-3 bottom-14 z-30 mx-auto max-w-sm rounded-2xl bg-white p-4 text-slate-900 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-2xl">
          {breed?.emoji ?? '🐱'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold">{peer.petName}</h3>
            {!isSelf && lvl.badge && <span>{lvl.badge}</span>}
            {rarity && (
              <span className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ background: rarity.color }}>
                {rarity.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {breed ? `${breed.name} · ${breed.englishName}` : '神秘品种'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            主人 <span className="font-medium text-slate-800">{isSelf ? `${peer.name}(我)` : peer.name}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            {ACTION_LABEL[action]}
          </p>
        </div>
        <button onClick={onClose} aria-label="关闭" className="-mr-1 -mt-1 rounded-full px-2 text-lg leading-none text-slate-400">×</button>
      </div>

      {breed && (
        <>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{breed.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {breed.personality.map(tag => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{tag}</span>
            ))}
          </div>
        </>
      )}

      {isSelf ? (
        <p className="mt-3 rounded-xl bg-pink-50 px-3 py-2 text-xs text-pink-700">
          这是你的猫。已经有 {friendCount} 位猫友啦,去找别的猫一起玩吧~
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">你们的好感 · {lvl.name} {lvl.badge}</span>
              <span className="text-xs text-slate-500">{b.total}{hi ? ` / ${hi}` : ''}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {hi ? `再 ${hi - b.total} 点成为「${BOND_LEVELS[b.level + 1].name}」` : '已经是最好的朋友啦'}
              {' · '}
              {b.todayLeft > 0 ? `今天还能 +${b.todayLeft}` : '今天的好感已满'}
            </p>
          </div>

          <div className="mt-3">
            {busy ? (
              <p className="text-center text-xs text-slate-500">正在和别的猫玩,等一会儿~</p>
            ) : pending ? (
              <p className="text-center text-xs text-slate-500">已发出邀请,等 {peer.petName} 回应…</p>
            ) : near ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onInvite('rub')} className="rounded-xl bg-pink-500 py-2 text-sm font-medium text-white">🤗 一起蹭蹭</button>
                <button onClick={() => onInvite('play')} className="rounded-xl bg-pink-500 py-2 text-sm font-medium text-white">🎾 一起玩</button>
              </div>
            ) : (
              <button onClick={onWalkTo} className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white">
                🐾 走过去找 {peer.petName}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
