import { motion } from 'framer-motion';
import { Coins, Star, Zap } from 'lucide-react';

interface GameHUDProps {
  level: number;
  title: string;
  xpProgress: number;
  currentXP: number;
  nextLevelXP: number;
  coins: number;
  userName: string;
}

export function GameHUD({ level, title, xpProgress, currentXP, nextLevelXP, coins, userName }: GameHUDProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 p-3">
      <div className="flex items-start justify-between">
        {/* Player Info */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <Star size={16} className="text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-[8px] font-bold text-white rounded-md px-1.5 py-0.5 border border-amber-400/50">
              Lv.{level}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary truncate max-w-[100px]">{userName || '旅行者'}</p>
            <p className="text-[9px] text-amber-400/80">{title}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap size={8} className="text-cyan-400" />
              <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[8px] text-text-muted">{currentXP}/{nextLevelXP}</span>
            </div>
          </div>
        </div>

        {/* Coins */}
        <motion.div
          className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-500/30"
          whileTap={{ scale: 0.95 }}
        >
          <Coins size={14} className="text-amber-400" />
          <span className="text-sm font-bold text-amber-400">{coins}</span>
        </motion.div>
      </div>
    </div>
  );
}
