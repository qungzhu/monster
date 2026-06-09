import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint, ChevronRight, Flame } from 'lucide-react';
import { characters } from '../data/characters';
import { ParticleBackground } from '../components/ParticleBackground';
import { PetScene } from '../components/pets/PetScene';

interface WelcomePageProps {
  userName: string;
  setUserName: (name: string) => void;
  selectCharacter: (id: string) => void;
  selectedCharacterId: string | null;
  isCheckedIn: boolean;
  checkIn: () => number;
  checkInStreak: number;
  getCheckInReward: () => number;
  intimacyLevels: Record<string, number>;
}

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

const themeBgs: Record<string, string> = {
  tuantuan: 'from-amber-950/50 via-yellow-950/30 to-transparent',
  xiaoxue: 'from-violet-950/50 via-purple-950/30 to-transparent',
  mianhuatang: 'from-pink-950/50 via-rose-950/30 to-transparent',
};

export function WelcomePage({
  userName,
  setUserName,
  selectCharacter,
  selectedCharacterId,
  isCheckedIn,
  checkIn,
  checkInStreak,
  getCheckInReward,
  intimacyLevels,
}: WelcomePageProps) {
  const [nameInput, setNameInput] = useState(userName);
  const [showNameInput, setShowNameInput] = useState(!userName);
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const [checkInAnimation, setCheckInAnimation] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ streak: number; reward: number } | null>(null);

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setShowNameInput(false);
    }
  };

  const handleCheckIn = () => {
    const streak = checkIn();
    const reward = getCheckInReward();
    setCheckInResult({ streak, reward });
    setCheckInAnimation(true);
    setTimeout(() => setCheckInAnimation(false), 3000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '早安';
    if (hour >= 12 && hour < 18) return '午安';
    return '晚安';
  };

  return (
    <div className="h-full overflow-y-auto pb-20 relative">
      <ParticleBackground color={hoveredChar ? themeColors[hoveredChar] : '#d97706'} />

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
            <span className="text-2xl">🐾</span>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              毛茸伙伴 FurryPal
            </h1>
            <span className="text-2xl">🐾</span>
          </motion.div>
          <p className="text-text-secondary text-sm">你的专属AI萌宠伙伴</p>
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
                告诉小宠物们你的名字吧~
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
                  className="bg-amber-600 rounded-xl px-5 py-3 text-white font-medium hover:bg-amber-700 transition-colors"
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
                {getGreeting()}，<span className="text-amber-400 font-medium">{userName}</span>
              </h2>
              <p className="text-text-muted text-sm mt-1">今天想和哪只小可爱玩呢？</p>
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
              onClick={handleCheckIn}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center">
                  <PawPrint size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">每日签到</p>
                  <p className="text-xs text-text-muted">
                    签到获得亲密度+{getCheckInReward()} 🐾
                    {checkInStreak > 0 && (
                      <span className="ml-1 text-amber-400">
                        🔥 已连续{checkInStreak}天
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted group-hover:text-amber-400 transition-colors" />
            </button>
          </motion.div>
        )}

        {/* Check-in result */}
        <AnimatePresence>
          {isCheckedIn && !showNameInput && (
            <motion.div
              initial={checkInAnimation ? { opacity: 0, scale: 0.8 } : { opacity: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-6"
            >
              <div className="inline-flex flex-col items-center gap-1">
                <span className="text-xs text-text-muted glass rounded-full px-3 py-1 inline-flex items-center gap-1">
                  <PawPrint size={12} className="text-amber-400" fill="currentColor" />
                  今日已签到
                  {checkInStreak > 0 && (
                    <span className="inline-flex items-center gap-0.5 ml-1 text-amber-400">
                      <Flame size={10} />
                      连续{checkInStreak}天
                    </span>
                  )}
                </span>
                {checkInAnimation && checkInResult && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-amber-400"
                  >
                    +{checkInResult.reward} 亲密度 ✨
                  </motion.span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    <div className="shrink-0">
                      <PetScene characterId={char.id} size="small" interactive={false} />
                    </div>

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

                      <div className="mt-2 flex items-center gap-2">
                        <PawPrint size={10} style={{ color: themeColors[char.id] }} fill="currentColor" />
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
                        <PawPrint size={12} className="text-white" fill="currentColor" />
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
