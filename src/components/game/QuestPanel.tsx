import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Gift } from 'lucide-react';
import { dailyQuests } from '../../data/gameConfig';
import type { Quest } from '../../data/gameConfig';

interface QuestPanelProps {
  show: boolean;
  onClose: () => void;
  getProgress: (type: string) => number;
  onClaimReward: (quest: Quest) => void;
  claimedQuests: Set<string>;
}

export function QuestPanel({ show, onClose, getProgress, onClaimReward, claimedQuests }: QuestPanelProps) {
  const completedCount = dailyQuests.filter(q => getProgress(q.type) >= q.target).length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            className="relative w-full max-w-sm max-h-[80vh] overflow-hidden rounded-2xl"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, rgba(30, 20, 50, 0.98) 0%, rgba(15, 10, 30, 0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {/* Header */}
            <div className="relative px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <span className="text-xl">📋</span> 每日任务
                  </h2>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    已完成 {completedCount}/{dailyQuests.length}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={16} className="text-text-muted" />
                </button>
              </div>
              <div className="mt-2 h-1.5 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  animate={{ width: `${(completedCount / dailyQuests.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Quest List */}
            <div className="px-4 pb-5 space-y-2.5 overflow-y-auto max-h-[60vh]">
              {dailyQuests.map((quest, index) => {
                const progress = getProgress(quest.type);
                const isComplete = progress >= quest.target;
                const isClaimed = claimedQuests.has(quest.id);

                return (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative rounded-xl p-3 transition-colors ${
                      isClaimed
                        ? 'bg-white/5 opacity-60'
                        : isComplete
                          ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30'
                          : 'bg-white/5 border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{quest.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{quest.title}</p>
                        <p className="text-[10px] text-text-muted">{quest.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((progress / quest.target) * 100, 100)}%`,
                                background: isComplete
                                  ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-text-muted shrink-0">
                            {Math.min(progress, quest.target)}/{quest.target}
                          </span>
                        </div>
                      </div>
                      {isClaimed ? (
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Check size={14} className="text-green-400" />
                        </div>
                      ) : isComplete ? (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onClaimReward(quest)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/30"
                        >
                          <Gift size={12} className="inline mr-1" />
                          领取
                        </motion.button>
                      ) : null}
                    </div>
                    {!isClaimed && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-amber-400">🪙 {quest.reward.coins}</span>
                        <span className="text-[9px] text-cyan-400">⚡ {quest.reward.xp}XP</span>
                        {quest.reward.intimacy && (
                          <span className="text-[9px] text-pink-400">💕 亲密+{quest.reward.intimacy}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
