import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionButtonsProps {
  onFeed: () => void;
  onPet: () => void;
  onPlay: () => void;
  onClean: () => void;
  color: string;
}

const actions = [
  { id: 'feed', icon: '🍖', label: '喂食', angle: -60 },
  { id: 'pet', icon: '🐾', label: '摸头', angle: -20 },
  { id: 'play', icon: '🎾', label: '玩耍', angle: 20 },
  { id: 'clean', icon: '🛁', label: '清洁', angle: 60 },
];

export function ActionButtons({ onFeed, onPet, onPlay, onClean, color }: ActionButtonsProps) {
  const [expanded, setExpanded] = useState(false);

  const handlers: Record<string, () => void> = {
    feed: onFeed,
    pet: onPet,
    play: onPlay,
    clean: onClean,
  };

  const handleAction = (id: string) => {
    handlers[id]?.();
    setExpanded(false);
  };

  return (
    <div className="relative">
      {/* Main toggle */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(!expanded)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative z-10"
        style={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
          boxShadow: `0 4px 20px ${color}44`,
        }}
      >
        <motion.span
          className="text-2xl"
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {expanded ? '✕' : '🎮'}
        </motion.span>
      </motion.button>

      {/* Radial actions */}
      <AnimatePresence>
        {expanded && (
          <>
            {actions.map(({ id, icon, label, angle }, index) => {
              const rad = (angle * Math.PI) / 180;
              const radius = 80;
              const x = Math.sin(rad) * radius;
              const y = -Math.cos(rad) * radius;

              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{ opacity: 1, x, y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => handleAction(id)}
                  className="absolute top-0 left-0 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-xl hover:bg-white/20 transition-colors"
                  style={{ transformOrigin: 'center center' }}
                  whileTap={{ scale: 0.85 }}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[7px] text-text-muted mt-[-2px]">{label}</span>
                </motion.button>
              );
            })}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
