import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { breeds, rarityLabels, speciesLabels } from '../../data/breeds';
import type { Species, Breed } from '../../data/breeds';
import { PetScene } from '../pets/PetScene';

interface AdoptionGalleryProps {
  show: boolean;
  onClose: () => void;
  onAdopt: (breedId: string) => void;
  currentBreedId: string | null;
  onOpenStudio?: () => void;
}

const speciesTabs: Species[] = ['dog', 'cat', 'fox', 'hamster'];

/**
 * The adoption hall: browse every breed with a live 3D preview and
 * take your favorite home. Summoned by saying "领养" in the world.
 */
export function AdoptionGallery({ show, onClose, onAdopt, currentBreedId, onOpenStudio }: AdoptionGalleryProps) {
  const [species, setSpecies] = useState<Species>('dog');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const list = useMemo(() => breeds.filter(b => b.species === species), [species]);
  const preview: Breed = useMemo(() => {
    const inList = list.find(b => b.id === previewId);
    return inList ?? list[0];
  }, [list, previewId]);

  if (!preview) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative w-full max-w-lg rounded-t-3xl overflow-hidden game-panel"
            style={{ maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle + close */}
            <div className="flex justify-center pt-3 relative">
              <div className="w-10 h-1 rounded-full bg-white/20" />
              <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X size={15} className="text-text-muted" />
              </button>
            </div>

            <div className="px-5 pt-2 pb-1 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">领养小屋 🏠</h2>
                <p className="text-[11px] text-text-muted">每一只都在等一个家</p>
              </div>
              {onOpenStudio && (
                <button
                  onClick={() => { onClose(); onOpenStudio(); }}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium text-white mt-1"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                >
                  📸 照片定制
                </button>
              )}
            </div>

            {/* Species tabs */}
            <div className="flex gap-2 px-5 py-2.5">
              {speciesTabs.map(s => (
                <button
                  key={s}
                  onClick={() => { setSpecies(s); setPreviewId(null); }}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    species === s ? 'bg-white/20 text-text-primary font-medium' : 'bg-white/5 text-text-muted'
                  }`}
                >
                  {speciesLabels[s]}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 130px)' }}>
              {/* Live 3D preview of the highlighted breed */}
              <div className="flex items-center gap-4 px-5 py-2">
                <div className="shrink-0 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <PetScene characterId={preview.characterId} breedId={preview.id} size="medium" interactive={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-text-primary">{preview.name}</h3>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ color: rarityLabels[preview.rarity].color, border: `1px solid ${rarityLabels[preview.rarity].color}55`, background: `${rarityLabels[preview.rarity].color}18` }}
                    >
                      {rarityLabels[preview.rarity].label}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted mb-1">{preview.englishName} · 小名「{preview.petName}」</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{preview.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {preview.personality.map(tag => (
                      <span key={tag} className="text-[9px] text-text-muted bg-white/8 rounded-full px-2 py-0.5">{tag}</span>
                    ))}
                  </div>
                  {currentBreedId === preview.id ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-400">
                      <Heart size={11} fill="currentColor" /> 已经是你的伙伴啦
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { onAdopt(preview.id); onClose(); }}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
                    >
                      <Heart size={11} className="inline mr-1" fill="currentColor" />
                      带{preview.petName}回家
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Breed grid */}
              <div className="grid grid-cols-4 gap-2 px-5 pt-2 pb-8">
                {list.map(b => {
                  const active = preview.id === b.id;
                  const isCurrent = currentBreedId === b.id;
                  return (
                    <motion.button
                      key={b.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setPreviewId(b.id)}
                      className="rounded-xl p-2 text-center transition-colors relative"
                      style={{
                        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${active ? rarityLabels[b.rarity].color + '88' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 text-[10px]">💚</span>
                      )}
                      <span className="text-xl block">{b.emoji}</span>
                      <span className={`text-[9px] block mt-0.5 leading-tight ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                        {b.name}
                      </span>
                      <span className="block mt-0.5 mx-auto w-1 h-1 rounded-full" style={{ background: rarityLabels[b.rarity].color }} />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
