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

const choices: Array<{ species: PickerSpecies; label: string; emoji: string; color: string }> = [
  { species: 'cat', label: '猫咪', emoji: '🐱', color: '#8b5cf6' },
  { species: 'dog', label: '狗狗', emoji: '🐶', color: '#f59e0b' },
  { species: 'fox', label: '狐狸', emoji: '🦊', color: '#ef4444' },
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
  const choice = choices.find(item => item.species === species)!;

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

  return (
    <div
      className="relative flex h-full min-h-[620px] flex-col items-center overflow-hidden px-4 pb-8 pt-12"
      style={{ background: `radial-gradient(ellipse at 50% 35%, ${choice.color}30 0%, transparent 52%), #14121d` }}
    >
      <div className="z-10 text-center">
        <h1 className="text-2xl font-bold text-text-primary">选择你的 AI 搭档</h1>
        <p className="mt-1 text-xs text-text-muted">猫咪、小狗或狐狸，会陪你管理每天的生活</p>
      </div>

      <div className="z-10 mt-4 flex gap-2">
        {choices.map(item => (
          <button
            key={item.species}
            onClick={() => chooseSpecies(item.species)}
            className="rounded-full px-4 py-2 text-sm transition-all"
            style={{
              background: species === item.species ? item.color : 'rgba(255,255,255,0.07)',
              color: species === item.species ? '#fff' : '#b9b5c4',
              boxShadow: species === item.species ? `0 6px 22px ${item.color}55` : 'none',
            }}
          >
            {item.emoji} {item.label}
          </button>
        ))}
      </div>

      <div className="relative mt-1 w-full max-w-sm flex-1">
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-x-0 top-0 flex h-[310px] items-center justify-center overflow-hidden rounded-3xl"
        >
          <PetScene
            characterId={selected.characterId}
            breedId={selected.id}
            size="picker"
            interactive
            emote={previewEmote}
          />
        </motion.div>

        <button
          aria-label="上一个品种"
          onClick={() => move(-1)}
          className="absolute left-0 top-32 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          aria-label="下一个品种"
          onClick={() => move(1)}
          className="absolute right-0 top-32 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white"
        >
          <ChevronRight size={22} />
        </button>

        <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto pb-2">
          {list.map((breed, breedIndex) => (
            <button
              key={breed.id}
              onClick={() => setIndex(breedIndex)}
              className="w-20 shrink-0 rounded-2xl px-2 py-2 text-center transition-all"
              style={{
                opacity: breedIndex === index ? 1 : 0.55,
                background: breedIndex === index ? `${choice.color}33` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${breedIndex === index ? choice.color : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <span className="block text-xl">{breed.emoji}</span>
              <span className="block truncate text-[10px] text-text-primary">{breed.name}</span>
              {breed.glbUrl && <span className="mt-0.5 block text-[8px] text-violet-300">真实 3D</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="z-10 min-h-24 text-center">
        <h2 className="text-lg font-bold text-text-primary">{selected.name}</h2>
        <p className="mt-1 text-[11px] text-text-muted">{selected.description}</p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onChoose(selected.id)}
          className="mt-3 rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${choice.color}, #ec4899)` }}
        >
          <Heart size={14} className="mr-1.5 inline" fill="currentColor" />
          让{selected.petName}成为我的搭档
        </motion.button>
      </div>
    </div>
  );
}
