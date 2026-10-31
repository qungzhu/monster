import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SCENES } from './sceneList';
import type { SceneId } from './sceneList';

interface ScenePickerProps {
  show: boolean;
  current: SceneId;
  onPick: (id: SceneId) => void;
  onClose: () => void;
}

/** Bottom sheet: pick where the pet lives. */
export function ScenePicker({ show, current, onPick, onClose }: ScenePickerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <motion.section
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="soft-glass relative w-full max-w-lg rounded-t-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4"
            onClick={e => e.stopPropagation()}
            aria-label="选择场景"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">带它去哪儿玩？</h2>
              <button type="button" onClick={onClose} aria-label="关闭" className="rounded-full p-1.5 text-[#9b8a80]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SCENES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.id)}
                  aria-pressed={s.id === current}
                  className={`relative h-20 overflow-hidden rounded-2xl text-left text-white shadow-sm transition-transform active:scale-95 ${s.id === current ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-white/60' : ''}`}
                  style={{ background: s.swatch }}
                >
                  <span className="absolute right-2 top-1.5 text-2xl">{s.emoji}</span>
                  <span className="absolute bottom-2 left-3 text-[14px] font-semibold drop-shadow">{s.name}</span>
                  {s.id === current && <span className="absolute left-2 top-2 rounded-full bg-white/90 p-0.5 text-violet-600"><Check size={12} /></span>}
                </button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
