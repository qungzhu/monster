import { motion, AnimatePresence } from 'framer-motion';

interface RewardPopupProps {
  show: boolean;
  message: string;
  rewards?: { coins?: number; xp?: number; intimacy?: number };
  onDone: () => void;
}

export function RewardPopup({ show, message, rewards, onDone }: RewardPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          onClick={onDone}
        >
          <div className="absolute inset-0 bg-black/50" />
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative text-center"
          >
            {/* Sparkle ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(251, 191, 36, 0.3)',
                  '0 0 60px rgba(251, 191, 36, 0.6)',
                  '0 0 20px rgba(251, 191, 36, 0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            <div
              className="rounded-2xl px-8 py-6 backdrop-blur-md"
              style={{
                background: 'linear-gradient(135deg, rgba(40, 25, 60, 0.95), rgba(20, 12, 35, 0.95))',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-3xl mb-3"
              >
                🎉
              </motion.div>
              <p className="text-text-primary font-medium text-sm mb-3">{message}</p>
              {rewards && (
                <div className="flex items-center justify-center gap-4">
                  {rewards.coins && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm">🪙</span>
                      <span className="text-amber-400 font-bold text-sm">+{rewards.coins}</span>
                    </motion.div>
                  )}
                  {rewards.xp && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm">⚡</span>
                      <span className="text-cyan-400 font-bold text-sm">+{rewards.xp}XP</span>
                    </motion.div>
                  )}
                  {rewards.intimacy && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm">💕</span>
                      <span className="text-pink-400 font-bold text-sm">+{rewards.intimacy}</span>
                    </motion.div>
                  )}
                </div>
              )}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-[10px] text-text-muted mt-3"
              >
                点击任意处关闭
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
