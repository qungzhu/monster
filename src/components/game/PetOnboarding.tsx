import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useGLTF } from '@react-three/drei';
import { breeds } from '../../data/breeds';
import type { Breed, Species } from '../../data/breeds';
import { PetScene } from '../pets/PetScene';
import type { EmoteKind } from '../pets/GLBPet';

interface PetOnboardingProps {
  onChoose: (breedId: string) => void;
}

type PickerSpecies = Extract<Species, 'cat' | 'dog' | 'fox'>;

const choices: Array<{ species: PickerSpecies; label: string; emoji: string }> = [
  { species: 'cat', label: '猫咪', emoji: '🐱' },
  { species: 'dog', label: '狗狗', emoji: '🐶' },
  { species: 'fox', label: '狐狸', emoji: '🦊' },
];

function wrap(index: number, length: number) {
  return (index % length + length) % length;
}

/** First-run companion picker backed by the real breed registry and 3D renderer. */
export function PetOnboarding({ onChoose }: PetOnboardingProps) {
  const [species, setSpecies] = useState<PickerSpecies>('cat');
  const [index, setIndex] = useState(0);
  const [previewEmote, setPreviewEmote] = useState<EmoteKind | null>('cute');
  const list = useMemo(() => breeds
    .filter(breed => breed.species === species)
    .sort((a, b) => Number(Boolean(b.glbUrl)) - Number(Boolean(a.glbUrl))), [species]);
  const selected = list[index] as Breed;

  // Download and parse the entire active species in the background so model
  // changes use drei's cache instead of showing a temporary fallback.
  useEffect(() => {
    list.forEach(breed => {
      if (breed.glbUrl) useGLTF.preload(breed.glbUrl);
    });
  }, [list]);

  useEffect(() => {
    // Mirror the Pixie-Bob action set for every cat. Rigged models use their
    // safe clips; static or face-sensitive models use GLBPet's matching
    // procedural choreography.
    const sequence: Array<EmoteKind | null> = [
      null, 'walk', 'run', 'groom', 'sleep', 'cute', 'eat', 'meow',
    ];
    let step = 0;
    setPreviewEmote(sequence[step]);
    const timer = setInterval(() => {
      step = (step + 1) % sequence.length;
      setPreviewEmote(sequence[step]);
    }, 3200);
    return () => clearInterval(timer);
  }, [selected.id]);

  const move = (amount: number) => setIndex(current => wrap(current + amount, list.length));
  const chooseSpecies = (next: PickerSpecies) => {
    setSpecies(next);
    setIndex(0);
  };

  // Console look (the .nx-* classes in index.css): periwinkle beveled
  // plates, a carbon command bar, warm colour only where you act.
  return (
    <div className="nx-canvas relative flex h-full min-h-[620px] flex-col overflow-hidden pb-6">
      <div className="nx-command z-10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)] text-center">
        <h1 className="nx-title text-[26px]">选择你的 AI 搭档</h1>
        <p className="mt-1.5 text-[11px] font-bold tracking-wide text-[#ecab37]">猫咪、小狗或狐狸 · 陪你管理每天的生活</p>
      </div>

      <div className="z-10 mt-3 flex justify-center gap-2 px-4" role="tablist" aria-label="宠物类型">
        {choices.map(item => (
          <button
            key={item.species}
            role="tab"
            aria-selected={species === item.species}
            aria-pressed={species === item.species}
            onClick={() => chooseSpecies(item.species)}
            className="nx-chip px-4 py-2.5"
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>

      <div className="relative mx-4 mt-3 flex-1">
        <div className="nx-inset nx-chamfer absolute inset-x-0 top-0 h-[300px] overflow-hidden">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-full items-center justify-center"
          >
            <PetScene
              characterId={selected.characterId}
              breedId={selected.id}
              size="picker"
              interactive
              emote={previewEmote}
            />
          </motion.div>
          {selected.glbUrl && (
            <span className="nx-chip pointer-events-none absolute left-4 top-3 px-2 py-1 text-[10px]" aria-pressed="true">3D</span>
          )}
        </div>

        <button aria-label="上一个品种" onClick={() => move(-1)} className="nx-orb absolute -left-1 top-[130px] z-20 flex h-10 w-10 items-center justify-center">
          <ChevronLeft size={22} strokeWidth={3} />
        </button>
        <button aria-label="下一个品种" onClick={() => move(1)} className="nx-orb absolute -right-1 top-[130px] z-20 flex h-10 w-10 items-center justify-center">
          <ChevronRight size={22} strokeWidth={3} />
        </button>

        <div className="absolute inset-x-0 bottom-0">
          <p className="nx-label mb-1.5 px-0.5">品种 {index + 1} / {list.length}</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {list.map((breed, breedIndex) => (
              <button
                key={breed.id}
                onClick={() => setIndex(breedIndex)}
                aria-pressed={breedIndex === index}
                className="nx-tile w-[74px] shrink-0 px-1.5 py-2 text-center"
              >
                <span className="block text-xl">{breed.emoji}</span>
                <span className="block truncate text-[11px] font-bold">{breed.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nx-plate nx-chamfer z-10 mx-4 mt-2 px-4 py-3 text-center">
        <h2 className="text-lg font-black text-[#21242e]">{selected.name}</h2>
        <p className="mt-1 text-[12px] leading-snug text-[#3d4f97]">{selected.description}</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onChoose(selected.id)}
          className="nx-go mt-3 inline-flex items-center px-6 py-3"
        >
          <Heart size={15} className="mr-1.5" fill="currentColor" />
          让{selected.petName}成为我的搭档 ▶
        </motion.button>
      </div>
    </div>
  );
}
