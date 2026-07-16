import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Coins, PawPrint } from 'lucide-react';
import type { Character, ChatMessage, MoodType, MoodEntry } from '../data/characters';
import type { PetStats, Quest } from '../data/gameConfig';
import { dailyQuests } from '../data/gameConfig';
import type { GameItem } from '../data/gameConfig';
import { parseIntent, getSuggestions } from '../utils/intents';
import { getTimeOfDay } from '../utils/emotion';
import { sendAIMessage } from '../utils/ai';
import { PetScene } from '../components/pets/PetScene';
import type { EmoteKind } from '../components/pets/GLBPet';
import { PetSelectStage } from '../components/pets/PetSelectStage';
import { QuestPanel } from '../components/game/QuestPanel';
import { ShopPanel } from '../components/game/ShopPanel';
import { MoodCalendar } from '../components/MoodCalendar';
import { MoodStats } from '../components/MoodStats';
import { IntimacyBar } from '../components/IntimacyBar';
import { IntimacyUnlocks } from '../components/IntimacyUnlocks';
import { WinterBackdrop } from '../components/world/WinterBackdrop';
import { AdoptionGallery } from '../components/game/AdoptionGallery';
import { CustomPetStudio } from '../components/game/CustomPetStudio';
import type { Breed } from '../data/breeds';

type CardType = 'quests' | 'shop' | 'adopt' | 'custom' | 'memories' | 'bond' | 'settings' | 'help' | null;

interface LivingWorldProps {
  character: Character | null;
  characters: Character[];
  selectCharacter: (id: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  chatHistory: ChatMessage[];
  addMessage: (characterId: string, message: ChatMessage) => void;
  getCharacterResponse: (character: Character, mood?: MoodType) => string;
  intimacyLevel: number;
  addIntimacy: (id: string, amount: number) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  clearAllData: () => void;
  moodEntries: MoodEntry[];
  addMoodEntry: (entry: MoodEntry) => void;
  coins: number;
  addCoins: (n: number) => void;
  addXP: (n: number) => void;
  levelInfo: { level: number; title: string; progress: number; currentXP: number; nextLevelXP: number };
  getPetStats: (id: string) => PetStats;
  getQuestProgress: (type: string) => number;
  updateQuestProgress: (type: string, amount?: number) => void;
  inventory: Record<string, number>;
  buyItem: (id: string) => boolean;
  useItem: (id: string, charId: string) => string | null;
  getReaction: (charId: string, action: string) => string;
  isCheckedIn: boolean;
  checkIn: () => number;
  checkInStreak: number;
  getCheckInReward: () => number;
  chatCount: number;
  adoptedBreedId: string | null;
  adoptBreed: (id: string) => void;
  petName: string;
  customPet: Breed | null;
  saveCustomPet: (pet: Breed) => void;
}

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

export function LivingWorld(props: LivingWorldProps) {
  const {
    character, characters, selectCharacter, userName, setUserName,
    chatHistory, addMessage, getCharacterResponse, intimacyLevel, addIntimacy,
    apiKey, setApiKey, clearAllData, moodEntries, addMoodEntry,
    coins, addCoins, addXP, levelInfo, getPetStats,
    getQuestProgress, updateQuestProgress, inventory, buyItem, useItem,
    getReaction, isCheckedIn, checkIn, checkInStreak, getCheckInReward, chatCount,
    adoptedBreedId, adoptBreed, petName, customPet, saveCustomPet,
  } = props;

  const [input, setInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [bubble, setBubble] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [activeCard, setActiveCard] = useState<CardType>(null);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const [floatingRewards, setFloatingRewards] = useState<Array<{ id: number; text: string }>>([]);
  const [petTapCount, setPetTapCount] = useState(0);
  const [emote, setEmote] = useState<EmoteKind | null>(null);
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardId = useRef(0);
  const greetedRef = useRef(false);

  const color = character ? themeColors[character.id] : '#d97706';
  const stats = character ? getPetStats(character.id) : { hunger: 80, mood: 80, cleanliness: 80 };
  const lowStat = stats.hunger < 30 ? 'hunger' as const : stats.mood < 30 ? 'mood' as const : stats.cleanliness < 30 ? 'cleanliness' as const : null;
  const hasClaimableQuest = dailyQuests.some(q => getQuestProgress(q.type) >= q.target && !claimedQuests.has(q.id));

  const playEmote = useCallback((kind: EmoteKind, durationMs = 6000) => {
    if (emoteTimer.current) clearTimeout(emoteTimer.current);
    setEmote(kind);
    emoteTimer.current = setTimeout(() => setEmote(null), durationMs);
  }, []);

  const say = useCallback((text: string, durationMs = 4500) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => setBubble(null), durationMs);
  }, []);

  const floatReward = useCallback((text: string) => {
    const id = ++rewardId.current;
    setFloatingRewards(prev => [...prev, { id, text }]);
    setTimeout(() => setFloatingRewards(prev => prev.filter(r => r.id !== id)), 1600);
  }, []);

  // The pet greets you when you arrive — it starts the conversation.
  useEffect(() => {
    if (!character || greetedRef.current) return;
    greetedRef.current = true;
    const timeOfDay = getTimeOfDay();
    const msgs = character.dailyMessages[timeOfDay];
    const greeting = msgs[Math.floor(Math.random() * msgs.length)];
    const t = setTimeout(() => say(greeting, 6000), 1200);
    return () => clearTimeout(t);
  }, [character, say]);

  // Proactive nudges: the pet asks for help when a stat runs low.
  useEffect(() => {
    if (!character || !lowStat) return;
    const nudges = {
      hunger: '肚子咕咕叫了...可以喂我一点好吃的吗？',
      mood: '有点无聊...陪我玩一会儿嘛~',
      cleanliness: '毛毛有点脏了，帮我洗香香好不好？',
    };
    const t = setTimeout(() => say(nudges[lowStat], 5000), 15000);
    return () => clearTimeout(t);
  }, [character, lowStat, say]);

  const doChat = async (text: string, emotion?: MoodType) => {
    if (!character) return;
    addMessage(character.id, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      emotion,
    });
    updateQuestProgress('chat');
    addXP(5);
    addCoins(2);
    setIsThinking(true);

    const finish = (raw: string) => {
      const response = petName && petName !== character.name
        ? raw.split(character.name).join(petName)
        : raw;
      addMessage(character.id, {
        id: `char-${Date.now()}`,
        role: 'character',
        content: response,
        timestamp: Date.now(),
      });
      addIntimacy(character.id, 2);
      setIsThinking(false);
      say(response, 7000);
    };

    if (apiKey) {
      try {
        const result = await sendAIMessage(text, character, chatHistory, intimacyLevel, userName, apiKey);
        finish(result.response);
        return;
      } catch { /* fall through to template */ }
    }
    setTimeout(() => finish(getCharacterResponse(character, emotion)), 900 + Math.random() * 1200);
  };

  const handleAction = (action: 'feed' | 'pet' | 'play' | 'clean') => {
    if (!character) return;
    if (action === 'play') playEmote('run', 5000);
    if (action === 'pet') playEmote('cute', 4000);
    if (action === 'feed') playEmote('knead', 5000);
    updateQuestProgress(action);
    if (action === 'pet') addIntimacy(character.id, 1);
    addXP(3);
    floatReward(action === 'pet' ? '💕 +1' : '⚡ +3');
    say(getReaction(character.id, action), 3500);
  };

  const handleCheckIn = () => {
    if (isCheckedIn) {
      say('今天已经签过到啦~ 明天也要来哦！', 3500);
      return;
    }
    checkIn();
    updateQuestProgress('checkin');
    const reward = getCheckInReward();
    if (character) addIntimacy(character.id, reward);
    addCoins(reward);
    addXP(15);
    floatReward(`🪙 +${reward} ⚡ +15`);
    say(`签到成功！已经连续 ${checkInStreak + 1} 天啦，谢谢你每天都来看我 💕`, 5000);
  };

  const handleSubmit = (raw: string) => {
    const text = raw.trim();
    if (!text || isThinking) return;
    setInput('');

    const intent = parseIntent(text);
    switch (intent.type) {
      case 'feed': case 'pet': case 'play': case 'clean':
        handleAction(intent.type);
        break;
      case 'checkin':
        handleCheckIn();
        break;
      case 'emote-run': playEmote('run', 7000); say('冲鸭——!🏃', 3000); addXP(3); break;
      case 'emote-roll': playEmote('roll', 6000); say('肚皮献给你~', 3000); if (character) addIntimacy(character.id, 1); break;
      case 'emote-groom': playEmote('groom', 6000); say('舔舔爪爪,保持干净~', 3000); break;
      case 'emote-cute': playEmote('cute', 6000); say('喵呜~最喜欢你啦 💕', 3000); if (character) addIntimacy(character.id, 2); break;
      case 'emote-stretch': playEmote('stretch', 5500); say('唔——伸个大懒腰，舒服~', 3000); break;
      case 'emote-pounce': playEmote('pounce', 7000); say('小猎手出动!🐾', 3000); addXP(3); break;
      case 'emote-rub': playEmote('rub', 6000); say('蹭蹭~你是我的 💕', 3000); if (character) addIntimacy(character.id, 2); break;
      case 'emote-knead': playEmote('knead', 6000); say('踩踩踩~安心又幸福', 3000); if (character) addIntimacy(character.id, 1); break;
      case 'emote-sploot': playEmote('sploot', 6000); say('板鸭趴~舒服极了', 3000); break;
      case 'quests': setActiveCard('quests'); break;
      case 'shop': setActiveCard('shop'); break;
      case 'adopt': setActiveCard('adopt'); break;
      case 'custom': setActiveCard('custom'); break;
      case 'memories': setActiveCard('memories'); break;
      case 'bond': setActiveCard('bond'); break;
      case 'settings': setActiveCard('settings'); break;
      case 'help': setActiveCard('help'); break;
      case 'mood': {
        // Emotional message: comfort + auto-journal, no forms to fill.
        if (intent.emotion && ['sad', 'anxious', 'lonely'].includes(intent.emotion)) playEmote('rub', 6000);
        if (intent.emotion && character) {
          addMoodEntry({
            id: `mood-${Date.now()}`,
            date: new Date().toISOString(),
            mood: intent.emotion,
            note: text,
            characterId: character.id,
            characterResponse: '',
          });
          updateQuestProgress('mood');
          floatReward(`📝 心情已记下`);
        }
        doChat(text, intent.emotion);
        break;
      }
      default:
        doChat(text);
    }
  };

  const handleClaimQuest = (quest: Quest) => {
    addCoins(quest.reward.coins);
    addXP(quest.reward.xp);
    if (quest.reward.intimacy && character) addIntimacy(character.id, quest.reward.intimacy);
    setClaimedQuests(prev => new Set([...prev, quest.id]));
    floatReward(`🪙 +${quest.reward.coins} ⚡ +${quest.reward.xp}`);
  };

  const handleBuyItem = (item: GameItem) => {
    if (buyItem(item.id)) say(`买到 ${item.name} 啦！`, 2500);
  };

  const handleUseItem = (item: GameItem) => {
    if (!character) return;
    const reaction = useItem(item.id, character.id);
    if (reaction) {
      const actionType = item.type === 'food' ? 'feed' : item.type === 'toy' ? 'play' : 'clean';
      updateQuestProgress(actionType);
      say(reaction, 3500);
      setActiveCard(null);
    }
  };

  const handlePetTap = () => {
    setPetTapCount(c => c + 1);
    handleAction('pet');
  };

  // ————— Onboarding: name —————
  if (!userName) {
    return (
      <div className="h-full flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(217,119,6,0.15) 0%, transparent 70%)' }} />
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center px-8 max-w-sm w-full">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="text-6xl mb-6">🐾</motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-pink-400 to-violet-400 bg-clip-text text-transparent mb-2">毛茸伙伴 FurryPal</h1>
          <p className="text-text-muted text-sm mb-8">一个会懂你的小生命，正在等你</p>
          <div className="glass rounded-2xl p-6">
            <p className="text-text-secondary text-sm mb-4">怎么称呼你？</p>
            <div className="flex gap-2">
              <input
                type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && nameInput.trim() && setUserName(nameInput.trim())}
                placeholder="你的名字..." maxLength={20}
                className="flex-1 bg-surface-light rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-amber-500/30 transition-colors text-sm"
              />
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => nameInput.trim() && setUserName(nameInput.trim())}
                className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl px-5 py-3 text-white font-medium">
                进入
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ————— Onboarding: choose companion —————
  if (!character) {
    return (
      <div className="h-full relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at 20% 45%, rgba(217,119,6,0.14) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.14) 0%, transparent 45%),
            radial-gradient(ellipse at 80% 45%, rgba(236,72,153,0.14) 0%, transparent 45%)`,
        }} />
        <div className="absolute top-0 left-0 right-0 z-20 pt-14 text-center pointer-events-none">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold text-text-primary mb-1">
            选择你的伙伴
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-text-muted text-xs">
            轻点其中一只，你们的故事就开始了 ✨
          </motion.p>
        </div>
        <PetSelectStage characters={characters} onSelect={selectCharacter} />
      </div>
    );
  }

  // ————— The Living World —————
  return (
    <div className={`h-full relative overflow-hidden theme-${character.theme}`}>
      <WinterBackdrop />
      {/* Subtle character-color aura around the pet's spot */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 42%, ${color}14 0%, transparent 50%)` }} />

      {/* Ambient status — one line, tappable, no panels */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-3 flex items-center justify-between">
        <button onClick={() => setActiveCard('bond')} className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
          <span className="text-xs font-bold" style={{ color }}>Lv.{levelInfo.level}</span>
          <div className="w-12 h-1 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${levelInfo.progress * 100}%`, background: color }} />
          </div>
          <PawPrint size={11} style={{ color }} fill="currentColor" />
          <span className="text-[11px] text-text-secondary">{intimacyLevel}</span>
        </button>
        <button onClick={() => setActiveCard('shop')} className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
          <Coins size={12} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-400">{coins}</span>
        </button>
      </div>

      {/* Low-stat whisper — appears only when the pet needs something */}
      <AnimatePresence>
        {lowStat && (
          <motion.button
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={() => lowStat === 'hunger' ? setActiveCard('shop') : handleAction(lowStat === 'mood' ? 'play' : 'clean')}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30 glass rounded-full px-3 py-1 text-[11px] text-amber-300 animate-pulse"
          >
            {lowStat === 'hunger' ? '🍖 它饿了' : lowStat === 'mood' ? '🎾 它想玩' : '🛁 该洗澡了'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* The world — full-screen winter scene with the pet at center */}
      <div className="absolute inset-0">
        <PetScene characterId={character.id} breedId={adoptedBreedId} customBreed={adoptedBreedId === 'custom' ? customPet : null} size="world" interactive={true} emote={emote} />
      </div>

      {/* Pet tap zone + bubble anchor (over the pet's spot in the scene) */}
      <div className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative w-48 h-48" onClick={handlePetTap}>

          {/* Speech bubble */}
          <AnimatePresence>
            {(bubble || isThinking) && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-max max-w-[260px]"
              >
                <div className="px-4 py-2.5 rounded-2xl text-sm backdrop-blur-md relative text-white leading-relaxed"
                  style={{ background: 'rgba(12, 8, 24, 0.78)', border: `1px solid ${color}66`, boxShadow: `0 4px 20px ${color}33` }}>
                  {isThinking ? (
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      {petName || character.name}正在想...
                    </motion.span>
                  ) : bubble}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                    style={{ background: 'rgba(12, 8, 24, 0.78)', borderRight: `1px solid ${color}66`, borderBottom: `1px solid ${color}66` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating rewards */}
          <AnimatePresence>
            {floatingRewards.map(r => (
              <motion.span
                key={r.id}
                initial={{ opacity: 0, y: 0, x: '-50%' }}
                animate={{ opacity: 1, y: -50 }}
                exit={{ opacity: 0, y: -80 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="absolute top-8 left-1/2 z-30 text-sm font-bold pointer-events-none whitespace-nowrap"
                style={{ color, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
              >
                {r.text}
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Tap hearts */}
          <AnimatePresence>
            {petTapCount > 0 && (
              <motion.span
                key={petTapCount}
                initial={{ opacity: 1, scale: 0.5, y: 0 }}
                animate={{ opacity: 0, scale: 1.4, y: -36 }}
                transition={{ duration: 0.9 }}
                className="absolute top-16 right-8 z-20 text-xl pointer-events-none"
              >
                💕
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Universal input — the only control in the world */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-2">
        {/* Contextual suggestion chips */}
        <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {getSuggestions({
            hour: new Date().getHours(),
            isCheckedIn,
            lowStat,
            hasClaimableQuest,
          }).map(chip => (
            <motion.button
              key={chip}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleSubmit(chip)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'rgba(10, 8, 20, 0.65)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(12px)' }}
            >
              {chip}
            </motion.button>
          ))}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); handleSubmit(input); }}
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: 'rgba(10, 8, 20, 0.75)', border: `1px solid ${color}33`, backdropFilter: 'blur(20px)' }}
        >
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={`和${petName || character.name}说话，或说"喂它""领养"...`}
            disabled={isThinking}
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <motion.button
            type="submit" disabled={!input.trim() || isThinking} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl disabled:opacity-30 transition-opacity"
            style={{ background: input.trim() ? `${color}33` : 'transparent' }}
          >
            <Send size={16} style={{ color: input.trim() ? color : undefined }} className={input.trim() ? '' : 'text-text-muted'} />
          </motion.button>
        </form>
      </div>

      {/* ————— Summoned cards ————— */}
      <QuestPanel
        show={activeCard === 'quests'}
        onClose={() => setActiveCard(null)}
        getProgress={getQuestProgress}
        onClaimReward={handleClaimQuest}
        claimedQuests={claimedQuests}
      />
      <AdoptionGallery
        show={activeCard === 'adopt'}
        onClose={() => setActiveCard(null)}
        onAdopt={(id) => { adoptBreed(id); }}
        currentBreedId={adoptedBreedId}
        onOpenStudio={() => setActiveCard('custom')}
      />
      <CustomPetStudio
        show={activeCard === 'custom'}
        onClose={() => setActiveCard(null)}
        onSave={(pet) => { saveCustomPet(pet); }}
        apiKey={apiKey}
      />
      <ShopPanel
        show={activeCard === 'shop'}
        onClose={() => setActiveCard(null)}
        coins={coins}
        inventory={inventory}
        onBuy={handleBuyItem}
        onUse={handleUseItem}
      />

      {/* Memories card */}
      <AnimatePresence>
        {activeCard === 'memories' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setActiveCard(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
              className="relative w-full max-w-sm max-h-[78vh] overflow-y-auto rounded-2xl game-panel p-5" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold text-text-primary mb-1">我们的回忆 📖</h2>
              <p className="text-[11px] text-text-muted mb-4">和{petName || character.name}在一起的 {chatCount} 次对话 · {moodEntries.length} 条心情</p>
              <MoodCalendar entries={moodEntries} />
              <div className="mt-4">
                <MoodStats entries={moodEntries} />
              </div>
              {moodEntries.length === 0 && (
                <p className="text-xs text-text-muted text-center py-6">还没有心情记录~ 直接告诉{character.name}你的感受，会自动记下来哦</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bond card */}
      <AnimatePresence>
        {activeCard === 'bond' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setActiveCard(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
              className="relative w-full max-w-sm max-h-[78vh] overflow-y-auto rounded-2xl game-panel p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{character.avatar}</span>
                <div>
                  <h2 className="text-base font-bold text-text-primary">{petName || character.name} · {character.title}</h2>
                  <p className="text-[11px] text-text-muted">{userName} 的 Lv.{levelInfo.level} {levelInfo.title}</p>
                </div>
              </div>
              <IntimacyBar level={intimacyLevel} maxLevel={character.maxIntimacy} />
              <div className="flex items-center justify-around mt-3 py-3 border-y border-white/5 mb-4">
                <div className="text-center">
                  <p className="text-sm font-bold">{chatCount}</p>
                  <p className="text-[10px] text-text-muted">互动次数</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{checkInStreak}</p>
                  <p className="text-[10px] text-text-muted">连续签到</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{coins}</p>
                  <p className="text-[10px] text-text-muted">金币</p>
                </div>
              </div>
              <IntimacyUnlocks character={character} level={intimacyLevel} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings card */}
      <AnimatePresence>
        {activeCard === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setActiveCard(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
              className="relative w-full max-w-sm rounded-2xl game-panel p-5" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold text-text-primary mb-4">设置 ⚙️</h2>
              <label className="text-xs text-text-muted block mb-1.5">Claude API Key（本地存储，不上传）</label>
              <input
                type="password" defaultValue={apiKey}
                onBlur={e => setApiKey(e.target.value.trim())}
                placeholder="sk-ant-..."
                className="w-full bg-surface-light rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-white/20 mb-4"
              />
              <button
                onClick={() => setActiveCard('adopt')}
                className="w-full glass rounded-xl py-2.5 text-sm text-text-secondary mb-2"
              >
                🏠 去领养小屋换一只伙伴
              </button>
              <button
                onClick={() => { if (confirm('确定清除所有数据吗？此操作不可恢复')) { clearAllData(); setActiveCard(null); } }}
                className="w-full rounded-xl py-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20"
              >
                清除所有数据
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help card */}
      <AnimatePresence>
        {activeCard === 'help' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setActiveCard(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 24 }}
              className="relative w-full max-w-sm rounded-2xl game-panel p-5" onClick={e => e.stopPropagation()}>
              <h2 className="text-base font-bold text-text-primary mb-3">这里没有按钮，只有对话 💬</h2>
              <div className="space-y-2.5 text-sm text-text-secondary">
                <p>🍖 说 <span style={{ color }}>"喂它"</span> — 投喂</p>
                <p>🐾 说 <span style={{ color }}>"摸摸头"</span> 或直接点它 — 摸头</p>
                <p>🎾 说 <span style={{ color }}>"陪它玩"</span> — 玩耍</p>
                <p>📋 说 <span style={{ color }}>"看任务"</span> — 每日任务</p>
                <p>🛍 说 <span style={{ color }}>"商店"</span> — 买东西</p>
                <p>🏠 说 <span style={{ color }}>"领养"</span> — 领养新品种伙伴</p>
                <p>📸 说 <span style={{ color }}>"上传照片"</span> — 用你家宝贝的照片定制3D形象</p>
                <p>📖 说 <span style={{ color }}>"回忆"</span> — 心情日历</p>
                <p>💛 说 <span style={{ color }}>"羁绊"</span> — 你们的关系</p>
                <p>😢 直接说心情 — 它会安慰你并记进日记</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
