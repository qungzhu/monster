import { motion, AnimatePresence } from 'framer-motion';

interface PetStickersProps {
  show: boolean;
  onSelect: (sticker: string) => void;
  characterId: string;
}

const stickerSets: Record<string, Array<{ emoji: string; label: string }>> = {
  tuantuan: [
    { emoji: '🐕', label: '团团' },
    { emoji: '🦴', label: '骨头' },
    { emoji: '🐾', label: '爪印' },
    { emoji: '🎾', label: '网球' },
    { emoji: '💛', label: '爱心' },
    { emoji: '🐶', label: '狗狗' },
    { emoji: '🌟', label: '星星' },
    { emoji: '🍖', label: '鸡腿' },
    { emoji: '🎀', label: '蝴蝶结' },
    { emoji: '🏃', label: '奔跑' },
    { emoji: '💤', label: '睡觉' },
    { emoji: '🥺', label: '撒娇' },
  ],
  xiaoxue: [
    { emoji: '🐱', label: '小雪' },
    { emoji: '🐟', label: '小鱼' },
    { emoji: '🐾', label: '爪印' },
    { emoji: '🧶', label: '毛线球' },
    { emoji: '💜', label: '爱心' },
    { emoji: '😼', label: '傲娇' },
    { emoji: '✨', label: '闪闪' },
    { emoji: '🐈', label: '猫咪' },
    { emoji: '🌙', label: '月亮' },
    { emoji: '😾', label: '哼' },
    { emoji: '💤', label: '睡觉' },
    { emoji: '🫣', label: '偷看' },
  ],
  mianhuatang: [
    { emoji: '🐹', label: '棉花糖' },
    { emoji: '🌻', label: '瓜子' },
    { emoji: '🐾', label: '爪印' },
    { emoji: '🥜', label: '坚果' },
    { emoji: '💗', label: '爱心' },
    { emoji: '🎡', label: '跑轮' },
    { emoji: '⭐', label: '星星' },
    { emoji: '🧀', label: '奶酪' },
    { emoji: '🍓', label: '草莓' },
    { emoji: '😵‍💫', label: '晕乎' },
    { emoji: '💤', label: '睡觉' },
    { emoji: '🤗', label: '抱抱' },
  ],
};

export function PetStickers({ show, onSelect, characterId }: PetStickersProps) {
  const stickers = stickerSets[characterId] || stickerSets.tuantuan;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden glass"
        >
          <div className="px-4 py-3">
            <p className="text-xs text-text-muted mb-2">萌宠表情</p>
            <div className="grid grid-cols-6 gap-1">
              {stickers.map(({ emoji, label }) => (
                <motion.button
                  key={label}
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => onSelect(emoji)}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-surface-lighter transition-colors"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[9px] text-text-muted">{label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
