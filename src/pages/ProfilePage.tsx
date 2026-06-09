import { useState } from 'react';
import { motion } from 'framer-motion';
import { PawPrint, Cake, Scale, Utensils, MessageCircle, Sparkles, Dog, Trophy } from 'lucide-react';
import type { Character } from '../data/characters';
import { IntimacyBar } from '../components/IntimacyBar';
import { IntimacyUnlocks } from '../components/IntimacyUnlocks';
import { ParticleBackground } from '../components/ParticleBackground';
import { PetScene } from '../components/pets/PetScene';

interface ProfilePageProps {
  character: Character | null;
  intimacyLevel: number;
  chatCount: number;
}

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

export function ProfilePage({ character, intimacyLevel, chatCount }: ProfilePageProps) {
  const [showUnlocks, setShowUnlocks] = useState(false);

  if (!character) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center">
          <PawPrint size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">请先选择一只小可爱</p>
        </div>
      </div>
    );
  }

  const color = themeColors[character.id];

  const infoItems = [
    { icon: Dog, label: '品种', value: character.breed },
    { icon: Cake, label: '年龄', value: character.age },
    { icon: Scale, label: '体重', value: character.weight },
    { icon: Utensils, label: '最爱食物', value: character.favFood },
  ];

  return (
    <div className={`h-full overflow-y-auto pb-20 theme-${character.theme}`}>
      <ParticleBackground color={color} />

      {/* Hero Section */}
      <div className="relative">
        <div
          className="h-56 relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${color}22 0%, transparent 100%)`,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PetScene characterId={character.id} size="large" interactive={true} />
          </motion.div>
        </div>

        <motion.div
          className="text-center -mt-6 relative z-10 px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold mb-1">{character.name}</h1>
          <p className="text-text-secondary text-sm">{character.englishName}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: `${color}22`,
                color: color,
                border: `1px solid ${color}33`,
              }}
            >
              <Sparkles size={10} className="inline mr-1" />
              {character.title}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="px-6 mt-6 space-y-4 relative z-10">
        {/* Intimacy */}
        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <IntimacyBar level={intimacyLevel} maxLevel={character.maxIntimacy} />
          <div className="flex items-center justify-around mt-3 pt-3 border-t border-white/5">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <MessageCircle size={12} style={{ color }} />
                <span className="text-sm font-bold">{chatCount}</span>
              </div>
              <span className="text-[10px] text-text-muted">互动次数</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <PawPrint size={12} style={{ color }} fill="currentColor" />
                <span className="text-sm font-bold">{intimacyLevel}</span>
              </div>
              <span className="text-[10px] text-text-muted">亲密度</span>
            </div>
          </div>
        </motion.div>

        {/* Info Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {infoItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-xl p-3 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}22` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] text-text-muted">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Personality Tags */}
        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles size={14} style={{ color }} />
            性格特点
          </h3>
          <div className="flex flex-wrap gap-2">
            {character.personality.map(p => (
              <span
                key={p}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: `${color}15`,
                  color,
                  border: `1px solid ${color}22`,
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Intimacy Unlocks */}
        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <button
            onClick={() => setShowUnlocks(!showUnlocks)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Trophy size={14} style={{ color }} />
              羁绊成就
            </h3>
            <span className="text-xs text-text-muted">
              {showUnlocks ? '收起' : '展开'} ▾
            </span>
          </button>
          {showUnlocks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3"
            >
              <IntimacyUnlocks character={character} level={intimacyLevel} />
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
        <motion.div
          className="glass rounded-2xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <PawPrint size={14} style={{ color }} />
            简介
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">{character.description}</p>
        </motion.div>

        {/* Backstory */}
        <motion.div
          className="glass rounded-2xl p-4 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-base">🏠</span>
            我们的故事
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">{character.backstory}</p>
        </motion.div>
      </div>
    </div>
  );
}
