import { motion } from 'framer-motion';
import { Lock, Unlock, Star, Gift, Heart, Crown } from 'lucide-react';
import type { Character } from '../data/characters';

interface IntimacyUnlocksProps {
  character: Character;
  level: number;
}

interface UnlockItem {
  level: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  reward: string;
}

const unlocks: UnlockItem[] = [
  { level: 10, title: '第一次握手', description: '萌宠开始主动向你打招呼', icon: <Star size={14} />, reward: '解锁更多问候语' },
  { level: 20, title: '建立信任', description: '萌宠开始和你分享日常', icon: <Heart size={14} />, reward: '解锁日常分享' },
  { level: 35, title: '亲密接触', description: '萌宠允许你抚摸它的肚子', icon: <Gift size={14} />, reward: '解锁互动动作' },
  { level: 50, title: '心有灵犀', description: '萌宠能感知你的情绪变化', icon: <Star size={14} />, reward: '情绪回应更丰富' },
  { level: 65, title: '形影不离', description: '萌宠无论去哪都要跟着你', icon: <Heart size={14} />, reward: '解锁特殊故事' },
  { level: 80, title: '灵魂伙伴', description: '你们之间有了独特的默契', icon: <Crown size={14} />, reward: '解锁专属称号' },
  { level: 100, title: '最佳拍档', description: '你们是彼此最重要的存在', icon: <Crown size={14} />, reward: '解锁隐藏剧情' },
];

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

export function IntimacyUnlocks({ character, level }: IntimacyUnlocksProps) {
  const color = themeColors[character.id] || '#d97706';

  return (
    <div className="space-y-2">
      {unlocks.map((item, index) => {
        const isUnlocked = level >= item.level;
        return (
          <motion.div
            key={item.level}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass rounded-xl p-3 flex items-center gap-3 ${
              isUnlocked ? '' : 'opacity-50'
            }`}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: isUnlocked ? `${color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isUnlocked ? color + '44' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {isUnlocked ? (
                <span style={{ color }}>{item.icon}</span>
              ) : (
                <Lock size={14} className="text-text-muted" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">{item.title}</span>
                <span className="text-[10px] text-text-muted">Lv.{item.level}</span>
                {isUnlocked && (
                  <Unlock size={10} style={{ color }} />
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">{item.description}</p>
              {isUnlocked && (
                <p className="text-[10px] mt-0.5" style={{ color: color + 'cc' }}>
                  {item.reward}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
