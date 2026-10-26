import { AnimatePresence, motion } from 'framer-motion';
import { Check, LoaderCircle, X } from 'lucide-react';
import { describeAction } from '../../data/agent';
import type { AgentPlan } from '../../data/agent';

export type PlanStatus = 'ready' | 'running' | 'done';

interface PlanCardProps {
  plan: AgentPlan | null;
  status: PlanStatus;
  /** Which actions will run; the owner can untick any of them. */
  selected: boolean[];
  onToggle: (index: number) => void;
  /** Per-action outcome once executed. */
  results: Array<{ ok: boolean; note?: string }>;
  onConfirm: () => void;
  onCancel: () => void;
  color: string;
}

/** "Here's what I'll do" — nothing runs until the owner confirms. */
export function PlanCard({ plan, status, selected, onToggle, results, onConfirm, onCancel, color }: PlanCardProps) {
  const count = selected.filter(Boolean).length;
  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          className="game-panel mb-2.5 rounded-2xl p-3"
          role="dialog"
          aria-label="执行计划"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-text-primary">{plan.reply}</p>
            {status !== 'running' && (
              <button type="button" onClick={onCancel} aria-label="关闭计划" className="-mr-1 -mt-1 rounded-full p-1 text-text-muted">
                <X size={14} />
              </button>
            )}
          </div>
          <ul className="mt-2 space-y-1.5">
            {plan.actions.map((a, i) => {
              const d = describeAction(a);
              const r = results[i];
              return (
                <li key={i}>
                  <label className={`flex items-center gap-2 rounded-xl bg-white/6 px-2.5 py-2 text-xs ${selected[i] ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                    {status === 'ready' ? (
                      <input
                        type="checkbox"
                        checked={selected[i]}
                        onChange={() => onToggle(i)}
                        aria-label={d.text}
                        className="h-3.5 w-3.5 shrink-0 accent-violet-500"
                      />
                    ) : r ? (
                      <span className={r.ok ? 'text-emerald-300' : 'text-rose-300'}>{r.ok ? <Check size={13} /> : <X size={13} />}</span>
                    ) : status === 'running' && selected[i] ? (
                      <LoaderCircle size={13} className="animate-spin text-text-muted" />
                    ) : (
                      <span className="w-[13px]" />
                    )}
                    <span className="shrink-0">{d.icon}</span>
                    <span className="min-w-0 flex-1">
                      {d.text}
                      {r?.note && <span className="block text-[10px] text-text-muted">{r.note}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {status === 'ready' && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-text-muted">也可以直接说「好的」或「算了」</span>
              <div className="flex gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg bg-white/8 px-3 py-1.5 text-[11px] text-text-secondary">取消</button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!count}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                  style={{ background: color }}
                >
                  确认执行{plan.actions.length > 1 ? ` (${count})` : ''}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
