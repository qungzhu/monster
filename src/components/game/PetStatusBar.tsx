import { motion } from 'framer-motion';
import type { PetStats } from '../../data/gameConfig';

interface PetStatusBarProps {
  stats: PetStats;
  color: string;
}

const statConfig = [
  { key: 'hunger' as const, label: '饱腹', icon: '🍖', color: 'from-orange-400 to-red-500', warnColor: 'text-red-400' },
  { key: 'mood' as const, label: '心情', icon: '😊', color: 'from-pink-400 to-purple-500', warnColor: 'text-purple-400' },
  { key: 'cleanliness' as const, label: '清洁', icon: '✨', color: 'from-cyan-400 to-blue-500', warnColor: 'text-blue-400' },
];

export function PetStatusBar({ stats }: PetStatusBarProps) {
  return (
    <div className="space-y-1.5">
      {statConfig.map(({ key, label, icon, color, warnColor }) => {
        const value = stats[key];
        const isLow = value < 30;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs w-4 text-center">{icon}</span>
            <span className={`text-[9px] w-6 ${isLow ? warnColor : 'text-text-muted'}`}>{label}</span>
            <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.6 }}
                style={{ opacity: isLow ? 0.6 : 1 }}
              />
            </div>
            <span className={`text-[9px] w-6 text-right ${isLow ? warnColor + ' animate-pulse' : 'text-text-muted'}`}>
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
