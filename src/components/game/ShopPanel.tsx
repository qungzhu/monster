import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, ShoppingBag } from 'lucide-react';
import { shopItems } from '../../data/gameConfig';
import type { GameItem } from '../../data/gameConfig';

interface ShopPanelProps {
  show: boolean;
  onClose: () => void;
  coins: number;
  inventory: Record<string, number>;
  onBuy: (item: GameItem) => void;
  onUse: (item: GameItem) => void;
}

const typeLabels: Record<string, string> = {
  food: '🍖 食物',
  toy: '🎾 玩具',
  clean: '🛁 清洁',
};

export function ShopPanel({ show, onClose, coins, inventory, onBuy, onUse }: ShopPanelProps) {
  const types = ['food', 'toy', 'clean'] as const;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, rgba(30, 20, 50, 0.98) 0%, rgba(15, 10, 30, 0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderBottom: 'none',
              maxHeight: '75vh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 pt-3 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-400" />
                萌宠商店
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-black/30 rounded-full px-3 py-1 border border-amber-500/20">
                  <Coins size={12} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">{coins}</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X size={16} className="text-text-muted" />
                </button>
              </div>
            </div>

            {/* Items by type */}
            <div className="px-4 pb-8 overflow-y-auto max-h-[60vh] space-y-4">
              {types.map(type => (
                <div key={type}>
                  <h3 className="text-xs font-medium text-text-muted mb-2">{typeLabels[type]}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {shopItems.filter(i => i.type === type).map(item => {
                      const owned = inventory[item.id] || 0;
                      const canBuy = coins >= item.price;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl p-3 bg-white/5 border border-white/8"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{item.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{item.name}</p>
                              <p className="text-[9px] text-text-muted">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onBuy(item)}
                              disabled={!canBuy}
                              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                                canBuy
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                                  : 'bg-white/5 text-text-muted border border-white/5'
                              }`}
                            >
                              <Coins size={10} />
                              {item.price}
                            </motion.button>
                            {owned > 0 && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onUse(item)}
                                className="flex-1 rounded-lg py-1.5 text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                              >
                                使用 ({owned})
                              </motion.button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
