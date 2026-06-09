import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scroll, ShoppingBag, Flame } from 'lucide-react';
import type { Character } from '../data/characters';
import type { PetStats, Quest } from '../data/gameConfig';
import { GameHUD } from '../components/game/GameHUD';
import { PetStatusBar } from '../components/game/PetStatusBar';
import { ActionButtons } from '../components/game/ActionButtons';
import { QuestPanel } from '../components/game/QuestPanel';
import { ShopPanel } from '../components/game/ShopPanel';
import { RewardPopup } from '../components/game/RewardPopup';
import { PetScene } from '../components/pets/PetScene';
import type { GameItem } from '../data/gameConfig';

interface GameHomePageProps {
  character: Character | null;
  characters: Character[];
  selectCharacter: (id: string) => void;
  selectedCharacterId: string | null;
  userName: string;
  setUserName: (name: string) => void;
  // Game
  coins: number;
  addCoins: (n: number) => void;
  xp: number;
  addXP: (n: number) => void;
  levelInfo: { level: number; title: string; currentXP: number; nextLevelXP: number; progress: number };
  getPetStats: (id: string) => PetStats;
  updatePetStat: (id: string, stat: keyof PetStats, amount: number) => void;
  getQuestProgress: (type: string) => number;
  updateQuestProgress: (type: string, amount?: number) => void;
  inventory: Record<string, number>;
  buyItem: (id: string) => boolean;
  useItem: (id: string, charId: string) => string | null;
  getReaction: (charId: string, action: string) => string;
  addIntimacy: (id: string, amount: number) => void;
  intimacyLevels: Record<string, number>;
  // Check-in
  isCheckedIn: boolean;
  checkIn: () => number;
  checkInStreak: number;
  getCheckInReward: () => number;
}

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

export function GameHomePage(props: GameHomePageProps) {
  const {
    character, characters, selectCharacter, userName, setUserName,
    coins, addCoins, addXP, levelInfo, getPetStats, updateQuestProgress,
    getQuestProgress, inventory, buyItem, useItem, getReaction,
    addIntimacy, intimacyLevels, isCheckedIn, checkIn, checkInStreak, getCheckInReward,
  } = props;

  const [showQuests, setShowQuests] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCharSelect, setShowCharSelect] = useState(!character);
  const [showNameInput, setShowNameInput] = useState(!userName);
  const [nameInput, setNameInput] = useState(userName);
  const [rewardPopup, setRewardPopup] = useState<{ show: boolean; message: string; rewards?: { coins?: number; xp?: number; intimacy?: number } }>({ show: false, message: '' });
  const [petBubble, setPetBubble] = useState<string | null>(null);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());

  const color = character ? themeColors[character.id] : '#d97706';
  const stats = character ? getPetStats(character.id) : { hunger: 80, mood: 80, cleanliness: 80 };

  const showBubble = (text: string) => {
    setPetBubble(text);
    setTimeout(() => setPetBubble(null), 2500);
  };

  const handleFeed = () => {
    if (!character) return;
    updateQuestProgress('feed');
    showBubble(getReaction(character.id, 'feed'));
  };

  const handlePet = () => {
    if (!character) return;
    updateQuestProgress('pet');
    addIntimacy(character.id, 1);
    showBubble(getReaction(character.id, 'pet'));
  };

  const handlePlay = () => {
    if (!character) return;
    updateQuestProgress('play');
    showBubble(getReaction(character.id, 'play'));
  };

  const handleClean = () => {
    if (!character) return;
    updateQuestProgress('clean');
    showBubble(getReaction(character.id, 'clean'));
  };

  const handleClaimReward = (quest: Quest) => {
    addCoins(quest.reward.coins);
    addXP(quest.reward.xp);
    if (quest.reward.intimacy && character) {
      addIntimacy(character.id, quest.reward.intimacy);
    }
    setClaimedQuests(prev => new Set([...prev, quest.id]));
    setRewardPopup({
      show: true,
      message: `${quest.title} 完成！`,
      rewards: quest.reward,
    });
  };

  const handleCheckIn = () => {
    checkIn();
    updateQuestProgress('checkin');
    const reward = getCheckInReward();
    if (character) addIntimacy(character.id, reward);
    addCoins(reward);
    addXP(15);
    setRewardPopup({
      show: true,
      message: `签到成功！连续${checkInStreak + 1}天`,
      rewards: { coins: reward, xp: 15, intimacy: reward },
    });
  };

  const handleBuyItem = (item: GameItem) => {
    if (buyItem(item.id)) {
      showBubble(`获得了 ${item.name}！`);
    }
  };

  const handleUseItem = (item: GameItem) => {
    if (!character) return;
    const reaction = useItem(item.id, character.id);
    if (reaction) {
      const actionType = item.type === 'food' ? 'feed' : item.type === 'toy' ? 'play' : 'clean';
      updateQuestProgress(actionType);
      showBubble(reaction);
    }
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setShowNameInput(false);
    }
  };

  // Name input screen
  if (showNameInput) {
    return (
      <div className="h-full flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(217, 119, 6, 0.15) 0%, transparent 70%)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center px-8 max-w-sm"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl mb-6"
          >
            🐾
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-pink-400 to-violet-400 bg-clip-text text-transparent mb-2">
            毛茸伙伴 FurryPal
          </h1>
          <p className="text-text-muted text-sm mb-8">开始你的萌宠冒险之旅</p>
          <div className="glass rounded-2xl p-6">
            <p className="text-text-secondary text-sm mb-4">冒险者，请留下你的名字</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="输入你的名字..."
                className="flex-1 bg-surface-light rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-amber-500/30 transition-colors text-sm"
                maxLength={20}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNameSubmit}
                className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl px-5 py-3 text-white font-medium"
              >
                出发！
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Character select screen
  if (showCharSelect || !character) {
    return (
      <div className="h-full overflow-y-auto pb-20 relative">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at top, rgba(217, 119, 6, 0.1) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 px-6 pt-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-xl font-bold text-text-primary mb-1">选择你的萌宠伙伴</h1>
            <p className="text-text-muted text-xs">每一只都有独特的个性和故事</p>
          </motion.div>

          <div className="space-y-4 max-w-sm mx-auto pb-8">
            {characters.map((char, index) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index + 0.2 }}
                onClick={() => { selectCharacter(char.id); setShowCharSelect(false); }}
                className="relative rounded-2xl overflow-hidden cursor-pointer group"
                style={{ border: `1px solid ${themeColors[char.id]}33` }}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{ background: `radial-gradient(ellipse at center, ${themeColors[char.id]}22 0%, transparent 70%)` }}
                />
                <div className="glass relative p-5 flex items-center gap-4">
                  <div className="shrink-0">
                    <PetScene characterId={char.id} size="small" interactive={false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary mb-0.5">{char.name}</h3>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full inline-block mb-1.5"
                      style={{ background: `${themeColors[char.id]}22`, color: themeColors[char.id] }}
                    >
                      {char.title}
                    </span>
                    <p className="text-text-secondary text-xs line-clamp-2">{char.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {char.personality.map(p => (
                        <span key={p} className="text-[10px] text-text-muted bg-surface-lighter rounded-full px-2 py-0.5">
                          {p}
                        </span>
                      ))}
                    </div>
                    {intimacyLevels[char.id] > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-surface-lighter rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${intimacyLevels[char.id]}%`, background: themeColors[char.id] }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">Lv.{intimacyLevels[char.id]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main game lobby
  return (
    <div className={`h-full relative overflow-hidden theme-${character.theme}`}>
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${color}18 0%, transparent 60%)` }}
      />

      {/* HUD */}
      <GameHUD
        level={levelInfo.level}
        title={levelInfo.title}
        xpProgress={levelInfo.progress}
        currentXP={levelInfo.currentXP}
        nextLevelXP={levelInfo.nextLevelXP}
        coins={coins}
        userName={userName}
      />

      {/* Pet Scene - Center */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ top: '-20px' }}>
        <div className="relative">
          <PetScene characterId={character.id} size="large" interactive={true} />

          {/* Speech bubble */}
          <AnimatePresence>
            {petBubble && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <div
                  className="px-4 py-2 rounded-2xl text-sm backdrop-blur-md relative"
                  style={{
                    background: `${color}22`,
                    border: `1px solid ${color}33`,
                  }}
                >
                  {petBubble}
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                    style={{ background: `${color}22`, borderRight: `1px solid ${color}33`, borderBottom: `1px solid ${color}33` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pet name + status */}
      <div className="absolute left-4 top-20 z-20 w-40">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{character.avatar}</span>
            <div>
              <p className="text-xs font-bold text-text-primary">{character.name}</p>
              <p className="text-[9px] text-text-muted">{character.title}</p>
            </div>
          </div>
          <PetStatusBar stats={stats} color={color} />
        </div>
      </div>

      {/* Right side buttons */}
      <div className="absolute right-4 top-20 z-20 space-y-2">
        {/* Quest button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowQuests(true)}
          className="w-12 h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5 relative"
        >
          <Scroll size={18} style={{ color }} />
          <span className="text-[8px] text-text-muted">任务</span>
          {/* Badge if unclaimed */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-surface" />
        </motion.button>

        {/* Shop button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowShop(true)}
          className="w-12 h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5"
        >
          <ShoppingBag size={18} style={{ color }} />
          <span className="text-[8px] text-text-muted">商店</span>
        </motion.button>

        {/* Check-in */}
        {!isCheckedIn && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCheckIn}
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5"
            style={{
              background: `linear-gradient(135deg, ${color}33, ${color}11)`,
              border: `1px solid ${color}33`,
            }}
          >
            <Flame size={18} className="text-amber-400" />
            <span className="text-[8px] text-amber-400">签到</span>
          </motion.button>
        )}
        {isCheckedIn && checkInStreak > 0 && (
          <div className="w-12 h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5 opacity-60">
            <Flame size={14} className="text-amber-400" />
            <span className="text-[8px] text-amber-400">{checkInStreak}天</span>
          </div>
        )}

        {/* Switch character */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCharSelect(true)}
          className="w-12 h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5"
        >
          <span className="text-lg">🔄</span>
          <span className="text-[8px] text-text-muted">切换</span>
        </motion.button>
      </div>

      {/* Action buttons - bottom center */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
        <ActionButtons
          onFeed={handleFeed}
          onPet={handlePet}
          onPlay={handlePlay}
          onClean={handleClean}
          color={color}
        />
      </div>

      {/* Panels */}
      <QuestPanel
        show={showQuests}
        onClose={() => setShowQuests(false)}
        getProgress={getQuestProgress}
        onClaimReward={handleClaimReward}
        claimedQuests={claimedQuests}
      />

      <ShopPanel
        show={showShop}
        onClose={() => setShowShop(false)}
        coins={coins}
        inventory={inventory}
        onBuy={handleBuyItem}
        onUse={handleUseItem}
      />

      <RewardPopup
        show={rewardPopup.show}
        message={rewardPopup.message}
        rewards={rewardPopup.rewards}
        onDone={() => setRewardPopup({ show: false, message: '' })}
      />
    </div>
  );
}
