import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { memoryCategoryMeta } from '../../data/memory';
import type { Memory, MemoryCategory, MemoryOp } from '../../data/memory';

interface MemoryPanelProps {
  show: boolean;
  onClose: () => void;
  petName: string;
  memories: Memory[];
  enabled: boolean;
  onToggleEnabled: (on: boolean) => void;
  onApply: (ops: MemoryOp[]) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const categories = Object.keys(memoryCategoryMeta) as MemoryCategory[];

const sourceLabel: Record<Memory['source'], string> = { auto: '聊天中记下', ai: 'AI 整理', manual: '你告诉我的' };

/** "它记得你的事": everything the pet remembers, viewable and editable. */
export function MemoryPanel({
  show, onClose, petName, memories, enabled, onToggleEnabled, onApply, onUpdate, onRemove, onClear,
}: MemoryPanelProps) {
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('profile');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onApply([{ op: 'add', text, category, source: 'manual' }]);
    setDraft('');
  };
  const saveEdit = () => {
    if (editing && editing.text.trim()) onUpdate(editing.id, editing.text.trim());
    setEditing(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.section
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="game-panel relative w-full max-w-lg overflow-y-auto rounded-t-3xl"
            style={{ height: 'min(86vh, 720px)' }}
            onClick={event => event.stopPropagation()}
            aria-label="它记得你的事"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <div>
                <h2 className="flex items-center gap-1.5 text-lg font-bold text-text-primary">
                  <Brain size={18} className="text-violet-300" /> {petName}记得你的事
                </h2>
                <p className="text-[11px] text-text-muted">
                  {memories.length ? `一共 ${memories.length} 条,聊天时会自然地用上` : '和我多聊聊,我会慢慢记住你'}
                </p>
              </div>
              <button aria-label="关闭记忆" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <X size={15} />
              </button>
            </div>

            <div className="px-5 py-2">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5">
                <span>
                  <span className="block text-xs font-semibold text-text-primary">聊天时自动记住</span>
                  <span className="block text-[10px] text-text-muted">名字、喜好、要发生的事、目标…</span>
                </span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={event => onToggleEnabled(event.target.checked)}
                  aria-label="聊天时自动记住"
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
            </div>

            <div className="px-5 py-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="mb-2 text-xs font-bold text-text-primary">告诉我一件事</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {categories.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`rounded-full px-2.5 py-1 text-[10px] ${category === c ? 'bg-violet-500 text-white' : 'bg-white/8 text-text-secondary'}`}
                    >
                      {memoryCategoryMeta[c].emoji} {memoryCategoryMeta[c].label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') add(); }}
                    maxLength={80}
                    placeholder="比如:我对芒果过敏"
                    aria-label="新的记忆"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-violet-400"
                  />
                  <button type="button" onClick={add} aria-label="添加记忆" className="flex w-10 items-center justify-center rounded-xl bg-violet-500 text-white">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-5 py-2">
              {categories.map(c => {
                const items = memories.filter(m => m.category === c).sort((a, b) => b.updatedAt - a.updatedAt);
                if (!items.length) return null;
                return (
                  <div key={c}>
                    <p className="mb-1.5 text-[11px] font-semibold text-text-secondary">
                      {memoryCategoryMeta[c].emoji} {memoryCategoryMeta[c].label}
                    </p>
                    <ul className="space-y-1.5">
                      {items.map(m => (
                        <li key={m.id} className="flex items-center gap-2 rounded-xl bg-white/6 px-3 py-2">
                          {editing?.id === m.id ? (
                            <>
                              <input
                                autoFocus
                                value={editing.text}
                                onChange={event => setEditing({ id: m.id, text: event.target.value })}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') saveEdit();
                                  if (event.key === 'Escape') setEditing(null);
                                }}
                                maxLength={80}
                                aria-label="编辑记忆"
                                className="min-w-0 flex-1 rounded-lg border border-violet-400/35 bg-white/8 px-2 py-1 text-sm text-text-primary outline-none"
                              />
                              <button type="button" onClick={saveEdit} aria-label="保存" className="text-emerald-300"><Check size={14} /></button>
                            </>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-primary">{m.text}</p>
                                <p className="text-[9px] text-text-muted">
                                  {sourceLabel[m.source]} · {new Date(m.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                  {m.followedUp ? ' · 已经问过你啦' : ''}
                                </p>
                              </div>
                              <button type="button" onClick={() => setEditing({ id: m.id, text: m.text })} aria-label="编辑" className="text-text-muted hover:text-text-primary"><Pencil size={13} /></button>
                              <button type="button" onClick={() => onRemove(m.id)} aria-label="忘掉这条" className="text-text-muted hover:text-rose-300"><Trash2 size={13} /></button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {!memories.length && (
                <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-xs leading-relaxed text-text-muted">
                  还没有记忆。试试对我说<br />「我叫小雨」「我喜欢吃草莓」「下周三要考试」
                </p>
              )}
            </div>

            <div className="px-5 pb-6 pt-2">
              <p className="text-[10px] leading-relaxed text-text-muted">
                🔒 记忆只保存在这台设备上,聊天时作为背景发给 AI。不会记录证件号、密码、银行卡等敏感信息。
                也可以直接说「忘掉 XX」。
              </p>
              {memories.length > 0 && (
                confirmClear ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => { onClear(); setConfirmClear(false); }} className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white">确定全部忘掉</button>
                    <button type="button" onClick={() => setConfirmClear(false)} className="flex-1 rounded-xl bg-white/10 py-2 text-xs text-text-secondary">再想想</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmClear(true)} className="mt-2 w-full rounded-xl bg-white/6 py-2 text-xs text-text-muted">清空全部记忆</button>
                )
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
