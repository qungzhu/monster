import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Heart } from 'lucide-react';
import { characters } from '../data/characters';
import { ParticleBackground } from '../components/ParticleBackground';

interface WelcomePageProps {
  userName: string;
  setUserName: (name: string) => void;
  selectCharacter: (id: string) => void;
  selectedCharacterId: string | null;
  isCheckedIn: boolean;
  checkIn: () => void;
  intimacyLevels: Record<string, number>;
}

const themeColors: Record<string, string> = {
  xinghui: '#e91e8c',
  lishen: '#4f46e5',
  qiyu: '#ea580c',
};

const themeBgs: Record<string, string> = {
  xinghui: 'from-pink-950/50 via-purple-950/30 to-transparent',
  lishen: 'from-indigo-950/50 via-blue-950/30 to-transparent',
  qiyu: 'from-orange-950/50 via-amber-950/30 to-transparent',
};

export function WelcomePage({
  userName,
  setUserName,
  selectCharacter,
  selectedCharacterId,
  isCheckedIn,
  checkIn,
  intimacyLevels,
}: WelcomePageProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [showNameInput, setShowNameInput] = useState(!userName);
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setShowNameInput(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午安';
    return '晚安';
  };

  return (
    <div className="h-full overflow-y-auto pb-20 relative">
      <ParticleBackground color={hoveredChar ? themeColors[hoveredChar] : '#e91e8c'} />

      <div className="relative z-10 px-6 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-3"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles size={24} className="text-primary-light" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              心语 SoulWhisper
            </h1>
            <Sparkles size={24} className="text-primary-light" />
          </motion.div>
          <p className="text-text-secondary text-sm">你的专属AI灵魂伴侣</p>
        </motion.div>

        {/* Name Input */}
        <AnimatePresence mode="wait">
          {showNameInput ? (
            <motion.div
              key="name-input"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass rounded-2xl p-6 mb-8 max-w-sm mx-auto"
            >
              <p className="text-text-secondary text-sm mb-4 text-center">
                在开始之前，告诉我你的名字吧~
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="输入你的名字..."
                  className="flex-1 bg-surface-light rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30 transition-colors text-sm"
                  maxLength={20}
                />
                <button
                  onClick={handleNameSubmit}
                  className="bg-primary rounded-xl px-5 py-3 text-white font-medium hover:bg-primary-dark transition-colors"
                >
                  确认
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <h2 className="text-xl text-text-primary">
                {getGreeting()}，<span className="text-primary-light font-medium">{userName}</span>
              </h2>
              <p className="text-text-muted text-sm mt-1">今天想和谁聊聊天呢？</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Check-in */}
        {!showNameInput && !isCheckedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-sm mx-auto mb-6"
          >
            <button
              onClick={checkIn}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <Heart size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">每日签到</p>
                  <p className="text-xs text-text-muted">签到获得亲密度+5</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted group-hover:text-primary-light transition-colors" />
            </button>
          </motion.div>
        )}

        {isCheckedIn && !showNameInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-6"
          >
            <span className="text-xs text-text-muted glass rounded-full px-3 py-1 inline-flex items-center gap-1">
              <Heart size={12} className="text-pink-400" fill="currentColor" />
              今日已签到
            </span>
          </motion.div>
        )}

        {/* Character Selection */}
        {!showNameInput && (
          <div className="space-y-4 max-w-sm mx-auto pb-8">
            {characters.map((char, index) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index + 0.3 }}
                onMouseEnter={() => setHoveredChar(char.id)}
                onMouseLeave={() => setHoveredChar(null)}
                onClick={() => selectCharacter(char.id)}
                className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 ${
                  selectedCharacterId === char.id ? 'ring-2' : ''
                }`}
                style={{
                  ['--tw-ring-color' as string]: themeColors[char.id],
                } as React.CSSProperties}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${themeBgs[char.id]} opacity-80`} />
                <div className="glass relative p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${themeColors[char.id]}33, ${themeColors[char.id]}11)`,
                        border: `1px solid ${themeColors[char.id]}44`,
                      }}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      {char.avatar}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text-primary">{char.name}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: `${themeColors[char.id]}22`,
                            color: themeColors[char.id],
                            border: `1px solid ${themeColors[char.id]}33`,
                          }}
                        >
                          {char.title}
                        </span>
                      </div>
                      <p className="text-text-secondary text-xs mb-2 line-clamp-2">{char.description}</p>
                      <div className="flex items-center gap-2">
                        {char.personality.map(p => (
                          <span key={p} className="text-[10px] text-text-muted bg-surface-lighter rounded-full px-2 py-0.5">
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* Intimacy preview */}
                      <div className="mt-2 flex items-center gap-2">
                        <Heart size={10} style={{ color: themeColors[char.id] }} fill="currentColor" />
                        <div className="flex-1 h-1 bg-surface-lighter rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(intimacyLevels[char.id] || 0)}%`,
                              background: themeColors[char.id],
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">{intimacyLevels[char.id] || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedCharacterId === char.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: themeColors[char.id] }}
                      >
                        <Heart size={12} className="text-white" fill="currentColor" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
