import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Coins, PawPrint, Sparkles } from 'lucide-react';
import type { Character, ChatMessage, MoodType, MoodEntry } from '../data/characters';
import type { PetStats, Quest } from '../data/gameConfig';
import { dailyQuests } from '../data/gameConfig';
import type { GameItem } from '../data/gameConfig';
import { parseIntent, getSuggestions } from '../utils/intents';
import { getTimeOfDay } from '../utils/emotion';
import { extractMemoriesAI, planWithAI, sendAIMessage } from '../utils/ai';
import { addGoogleCalendarEvent, getGoogleCalendarStatus } from '../utils/googleCalendar';
import { PetScene } from '../components/pets/PetScene';
import type { EmoteKind } from '../components/pets/GLBPet';
import { PetOnboarding } from '../components/game/PetOnboarding';
import { QuestPanel } from '../components/game/QuestPanel';
import { ShopPanel } from '../components/game/ShopPanel';
import { MoodCalendar } from '../components/MoodCalendar';
import { MoodStats } from '../components/MoodStats';
import { IntimacyBar } from '../components/IntimacyBar';
import { IntimacyUnlocks } from '../components/IntimacyUnlocks';
import { WinterBackdrop } from '../components/world/WinterBackdrop';
import { AdoptionGallery } from '../components/game/AdoptionGallery';
import { CustomPetStudio } from '../components/game/CustomPetStudio';
import { LifeDashboard } from '../components/game/LifeDashboard';
import { getBreed } from '../data/breeds';
import type { Breed } from '../data/breeds';
import { companionRoles } from '../data/companion';
import type { AgentRun, CompanionRole, LifeItem } from '../data/companion';
import { getGeneratedPet } from '../data/generatedPetGallery';
import { MemoryPanel } from '../components/game/MemoryPanel';
import { PlanCard } from '../components/game/PlanCard';
import type { PlanStatus } from '../components/game/PlanCard';
import { CANCEL_RE, CONFIRM_RE, describeAction, looksLikeTask, normalizePlan, planLocally } from '../data/agent';
import type { AgentPlan } from '../data/agent';
import { useProactive } from '../proactive/useProactive';
import { ProactiveCard } from '../proactive/ProactiveCard';
import type { Job } from '../proactive/jobs';
import { localTimeZone } from '../data/time';
import { rollForward } from '../../shared/recurrence';
import { extractMemoriesLocally, memoryCommand, memoryContext, pendingFollowUp, recallLine } from '../data/memory';
import type { Memory, MemoryOp } from '../data/memory';

type CardType = 'life' | 'quests' | 'shop' | 'adopt' | 'custom' | 'memories' | 'about-me' | 'bond' | 'settings' | 'help' | null;

interface LivingWorldProps {
  character: Character | null;
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
  selectedGeneratedPetKey: string | null;
  hubName: string;
  setHubName: (name: string) => void;
  agentRuns: AgentRun[];
  recordAgentRun: (command: string, summary: string) => void;
  companionRole: CompanionRole;
  setCompanionRole: (role: CompanionRole) => void;
  lifeItems: LifeItem[];
  addLifeItem: (item: Omit<LifeItem, 'id' | 'createdAt' | 'completed'>) => LifeItem;
  toggleLifeItem: (id: string) => void;
  removeLifeItem: (id: string) => void;
  updateLifeItem: (id: string, patch: Partial<Omit<LifeItem, 'id'>>) => void;
  memories: Memory[];
  memoryEnabled: boolean;
  setMemoryEnabled: (on: boolean) => void;
  applyMemories: (ops: MemoryOp[]) => Memory[];
  updateMemory: (id: string, text: string) => void;
  removeMemory: (id: string) => void;
  markMemoryFollowedUp: (id: string) => void;
  clearMemories: () => void;
}

const themeColors: Record<string, string> = {
  tuantuan: '#d97706',
  xiaoxue: '#7c3aed',
  mianhuatang: '#ec4899',
};

export function LivingWorld(props: LivingWorldProps) {
  const {
    character, userName, setUserName,
    chatHistory, addMessage, getCharacterResponse, intimacyLevel, addIntimacy,
    apiKey, setApiKey, clearAllData, moodEntries, addMoodEntry,
    coins, addCoins, addXP, levelInfo, getPetStats,
    getQuestProgress, updateQuestProgress, inventory, buyItem, useItem,
    getReaction, isCheckedIn, checkIn, checkInStreak, getCheckInReward, chatCount,
    adoptedBreedId, adoptBreed, petName, customPet, saveCustomPet,
    selectedGeneratedPetKey, hubName, setHubName, agentRuns, recordAgentRun,
    companionRole, setCompanionRole, lifeItems, addLifeItem, toggleLifeItem, removeLifeItem,
    memories, memoryEnabled, setMemoryEnabled, applyMemories, updateMemory, removeMemory,
    markMemoryFollowedUp, clearMemories, updateLifeItem,
  } = props;

  const [input, setInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [bubble, setBubble] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [activeCard, setActiveCard] = useState<CardType>(null);
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const [floatingRewards, setFloatingRewards] = useState<Array<{ id: number; text: string }>>([]);
  const [petTapCount, setPetTapCount] = useState(0);
  const [isPetting, setIsPetting] = useState(false);
  const [emote, setEmote] = useState<EmoteKind | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pettingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pettingHandled = useRef(false);
  const rewardId = useRef(0);
  const greetedRef = useRef(false);
  // Task agent: a proposed plan waits here until the owner confirms.
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('ready');
  const [planSelected, setPlanSelected] = useState<boolean[]>([]);
  const [planResults, setPlanResults] = useState<Array<{ ok: boolean; note?: string }>>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const planCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const color = character ? themeColors[character.id] : '#d97706';
  const generatedPet = getGeneratedPet(selectedGeneratedPetKey);
  const baseBreed = getBreed(adoptedBreedId);
  const generatedModelBreed = generatedPet?.modelUrl && baseBreed
    ? { ...baseBreed, glbUrl: generatedPet.modelUrl }
    : null;
  const stats = character ? getPetStats(character.id) : { hunger: 80, mood: 80, cleanliness: 80 };
  const lowStat = stats.hunger < 30 ? 'hunger' as const : stats.mood < 30 ? 'mood' as const : stats.cleanliness < 30 ? 'cleanliness' as const : null;
  const hasClaimableQuest = dailyQuests.some(q => getQuestProgress(q.type) >= q.target && !claimedQuests.has(q.id));
  const pendingLifeItems = lifeItems.filter(item => !item.completed).length;
  const displayHubName = hubName || `${petName || character?.name || 'FurryPal'} AI 中枢`;

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

  const playEmote = useCallback((kind: EmoteKind | null, durationMs = 6000) => {
    if (emoteTimer.current) clearTimeout(emoteTimer.current);
    setEmote(kind);
    if (kind) emoteTimer.current = setTimeout(() => setEmote(null), durationMs);
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

  // Calendar actions are only offered when Google Calendar is connected.
  useEffect(() => {
    let alive = true;
    getGoogleCalendarStatus().then(st => { if (alive) setCalendarConnected(st.connected); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Reminders. While the app is open the pet speaks up itself; with
  // notifications on, pushes from the reminder server arrive too — `spoken`
  // makes sure each occurrence is said once either way.
  const spoken = useRef(new Set<string>());
  const remindItem = useCallback((item: LifeItem) => {
    if (!item.due) return;
    const key = `r:${item.id}@${Date.parse(item.due)}`;
    if (item.repeat) {
      // Repeating: move on to the next occurrence.
      updateLifeItem(item.id, { due: new Date(rollForward(Date.parse(item.due), item.repeat, localTimeZone(), Date.now())).toISOString() });
    } else {
      updateLifeItem(item.id, { remindedAt: new Date().toISOString() });
    }
    if (spoken.current.has(key)) return;
    spoken.current.add(key);
    playEmote('meow', 3500);
    say(`⏰ 到时间啦:${item.title}!`, 7000);
  }, [updateLifeItem, playEmote, say]);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const due = lifeItems.find(it => it.due && !it.completed && (it.repeat || !it.remindedAt)
        && Date.parse(it.due) <= now && now - Date.parse(it.due) < 12 * 3_600_000);
      if (due) remindItem(due);
    };
    const t = setInterval(check, 15_000);
    const first = setTimeout(check, 2500);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [lifeItems, remindItem]);

  const onPush = useCallback((job: Job) => {
    if (job.kind === 'reminder') {
      const item = lifeItems.find(it => `r:${it.id}` === job.id);
      if (item && Date.parse(item.due ?? '') === job.at) { remindItem(item); return; }
    }
    const key = `${job.id}@${job.at}`;
    if (spoken.current.has(key)) return;
    spoken.current.add(key);
    if (job.kind === 'event-followup') markMemoryFollowedUp(job.id.replace(/^ask:/, ''));
    playEmote(job.kind === 'miss-you' ? 'rub' : 'cute', 3500);
    say(job.body, 7000);
  }, [lifeItems, remindItem, markMemoryFollowedUp, playEmote, say]);

  const proactive = useProactive({ items: lifeItems, memories, petName: petName || character?.name || '我', onMessage: onPush });

  useEffect(() => () => {
    if (planCloseTimer.current) clearTimeout(planCloseTimer.current);
    if (pettingTimer.current) clearTimeout(pettingTimer.current);
    if (emoteTimer.current) clearTimeout(emoteTimer.current);
  }, []);

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

    // Learn from what was said: the LLM extractor when the server has a key,
    // otherwise the offline rules. Runs alongside the reply.
    if (memoryEnabled) {
      const recent = [...chatHistory.filter(m => m.role === 'user').slice(-3).map(m => m.content), text];
      extractMemoriesAI(recent, memories, apiKey)
        .then(ops => remember(ops ?? extractMemoriesLocally(text, memories)));
    }

    const followUp = pendingFollowUp(memories);
    const result = await sendAIMessage(text, character, chatHistory, intimacyLevel, userName, apiKey, {
      role: companionRole,
      memoryContext: memoryContext(memories),
      followUp: followUp?.text,
    });
    if (result.isAI) {
      if (followUp) markMemoryFollowedUp(followUp.id);
      finish(result.response);
      return;
    }
    // Offline: a template reply, plus a line that shows the pet remembers.
    const recall = recallLine(memories);
    if (recall?.followUpId) markMemoryFollowedUp(recall.followUpId);
    const reply = getCharacterResponse(character, emotion);
    setTimeout(() => finish(recall ? `${reply} ${recall.line}` : reply), 600 + Math.random() * 900);
  };

  const remember = (ops: MemoryOp[]) => {
    const added = applyMemories(ops);
    if (added.length) floatReward(`🧠 记住了:${added[0].text.replace(/\s*\([^)]*说的\)/u, '')}`);
  };

  const handleAction = (action: 'feed' | 'pet' | 'play' | 'clean') => {
    if (!character) return;
    updateQuestProgress(action);
    if (action === 'pet') addIntimacy(character.id, 1);
    addXP(3);
    floatReward(action === 'pet' ? '💕 +1' : '⚡ +3');
    say(getReaction(character.id, action), 3500);
    if (action === 'pet') playEmote('rub');
    if (action === 'play') playEmote('zoomies', 8000);
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

  const logExchange = (userText: string, reply: string) => {
    if (!character) return;
    addMessage(character.id, { id: `user-${Date.now()}`, role: 'user', content: userText, timestamp: Date.now() });
    addMessage(character.id, { id: `char-${Date.now() + 1}`, role: 'character', content: reply, timestamp: Date.now() + 1 });
  };

  const closePlan = () => {
    if (planCloseTimer.current) clearTimeout(planCloseTimer.current);
    setPlan(null);
  };

  /** Understand a request; returns false when it isn't a task after all. */
  const proposePlan = async (text: string): Promise<boolean> => {
    setIsThinking(true);
    const ai = await planWithAI(text, lifeItems, memoryContext(memories), calendarConnected, apiKey);
    setIsThinking(false);
    const next = normalizePlan(ai ? ai.plan : planLocally(text, lifeItems), text, lifeItems, calendarConnected);
    if (!next) return false;
    if (planCloseTimer.current) clearTimeout(planCloseTimer.current);
    setPlan(next);
    setPlanSelected(next.actions.map(() => true));
    setPlanResults([]);
    setPlanStatus('ready');
    playEmote('cute', 2500);
    say(next.reply, 3500);
    logExchange(text, `${next.reply}${next.actions.map(a => `\n${describeAction(a).icon} ${describeAction(a).text}`).join('')}`);
    return true;
  };

  const executePlan = async () => {
    if (!plan || planStatus !== 'ready') return;
    setPlanStatus('running');
    const results: Array<{ ok: boolean; note?: string }> = [];
    for (const [i, a] of plan.actions.entries()) {
      if (!planSelected[i]) { results.push({ ok: false, note: '已跳过' }); continue; }
      try {
        switch (a.type) {
          case 'add_item':
            addLifeItem({ type: a.itemType, title: a.title, due: a.due, repeat: a.repeat, detail: plan.command });
            break;
          case 'complete_item':
            if (lifeItems.find(it => it.id === a.id && !it.completed)) toggleLifeItem(a.id);
            break;
          case 'remove_item':
            removeLifeItem(a.id);
            break;
          case 'calendar_event':
            try {
              await addGoogleCalendarEvent({ summary: a.summary, start: a.start, end: a.end, description: `由 FurryPal 根据「${plan.command}」创建` });
            } catch {
              // Keep the intent: fall back to a local reminder.
              addLifeItem({ type: 'todo', title: a.summary, due: a.start, detail: plan.command });
              results.push({ ok: true, note: '日历写入失败,已改为本地提醒' });
              setPlanResults([...results]);
              continue;
            }
            break;
          case 'remember':
            applyMemories([{ op: 'add', text: a.text, category: a.category, source: 'manual' }]);
            break;
          case 'set_role':
            setCompanionRole(a.role);
            break;
        }
        results.push({ ok: true });
      } catch {
        results.push({ ok: false, note: '没能完成' });
      }
      setPlanResults([...results]);
    }
    const done = results.filter((r, i) => r.ok && planSelected[i]).length;
    const summary = plan.actions.filter((_, i) => planSelected[i] && results[i]?.ok).map(a => describeAction(a).text).join(';');
    recordAgentRun(plan.command, summary || '没有执行任何动作');
    setPlanStatus('done');
    addXP(2 * done);
    if (done) floatReward(`✅ 完成 ${done} 件`);
    playEmote('cute', 3000);
    say(done ? `搞定啦!${done > 1 ? `${done} 件事都` : ''}办好了 ✨` : '这次什么都没做哦~', 3500);
    planCloseTimer.current = setTimeout(() => setPlan(null), 3200);
  };

  const cancelPlan = () => {
    if (!plan || planStatus === 'running') return;
    closePlan();
    say('好,那就先不做啦~', 2500);
  };

  const handleSubmit = async (raw: string) => {
    const text = raw.trim();
    if (!text || isThinking) return;
    setInput('');

    // A plan is waiting: "好的" runs it, "算了" drops it, anything else
    // replaces it with whatever comes next.
    if (plan && planStatus === 'ready') {
      if (CONFIRM_RE.test(text)) { void executePlan(); return; }
      if (CANCEL_RE.test(text)) { cancelPlan(); return; }
      closePlan();
    }

    // Explicit memory commands and "你记得我什么" come before life commands
    // ("记得…" would otherwise become a to-do).
    const cmd = memoryCommand(text, memories);
    if (cmd) {
      if (cmd.kind === 'remember') {
        applyMemories(cmd.ops);
        playEmote('cute', 3000);
        floatReward('🧠 记住了');
        say(`好,我记住了:${cmd.ops[0].op === 'add' ? cmd.ops[0].text : ''} 💕`, 4200);
      } else if (cmd.ops.length) {
        applyMemories(cmd.ops);
        say(`好~ 已经忘掉了 ${cmd.ops.length} 条,不会再提啦。`, 4000);
      } else if (!looksLikeTask(text) || !(await proposePlan(text))) {
        // "删掉X" with no matching memory may still be a to-do to delete.
        say('我好像没记过这件事哦~ 说「你记得我什么」可以看看我记住的。', 4500);
      }
      return;
    }
    if (parseIntent(text).type === 'about-me') {
      setActiveCard('about-me');
      say(memories.length ? `我记得你 ${memories.length} 件事哦,都在这里~` : '我还不太了解你,多和我聊聊吧~', 3500);
      return;
    }

    // Requests to do something get a plan to confirm, not instant changes.
    if (looksLikeTask(text) && (await proposePlan(text))) return;

    const intent = parseIntent(text);
    // Chat replies learn inside doChat (where the AI extractor can run).
    if (memoryEnabled && intent.type !== 'chat' && intent.type !== 'mood') remember(extractMemoriesLocally(text, memories));
    switch (intent.type) {
      case 'feed': case 'pet': case 'play': case 'clean':
        handleAction(intent.type);
        break;
      case 'emote-run': playEmote('run', 7000); say('冲鸭——！🏃', 3000); addXP(3); break;
      case 'emote-roll': playEmote('roll'); say('肚皮献给你～', 3000); break;
      case 'emote-groom': playEmote('groom'); say('舔舔爪爪，保持干净～', 3000); break;
      case 'emote-cute': playEmote('cute'); say('最喜欢你啦 💕', 3000); break;
      case 'emote-stretch': playEmote('stretch', 5500); say('伸个大懒腰，舒服～', 3000); break;
      case 'emote-pounce': playEmote('pounce', 7000); say('小猎手出动！🐾', 3000); addXP(3); break;
      case 'emote-rub': playEmote('rub'); say('蹭蹭～你是我的 💕', 3000); break;
      case 'emote-knead': playEmote('knead'); say('踩踩踩～安心又幸福', 3000); break;
      case 'emote-sploot': playEmote('sploot'); say('板鸭趴～舒服极了', 3000); break;
      case 'emote-walk': playEmote('walk', 8000); say('慢悠悠散个步～🐾', 3000); addXP(2); break;
      case 'emote-sleep': playEmote('sleep', 9000); say('呼噜噜…💤', 3500); break;
      case 'emote-meow': playEmote('meow', 4000); say('叫一声给你听！', 2500); break;
      case 'emote-zoomies': playEmote('zoomies', 8000); say('暴走模式启动！⚡', 3000); addXP(5); break;
      case 'checkin':
        handleCheckIn();
        break;
      case 'life': setActiveCard('life'); break;
      case 'plaza': say('走，去雪原广场找小伙伴！❄️', 1500); setTimeout(() => { location.href = '/plaza'; }, 700); break;
      case 'quests': setActiveCard('quests'); break;
      case 'shop': setActiveCard('shop'); break;
      case 'adopt': setActiveCard('adopt'); break;
      case 'custom': setActiveCard('custom'); break;
      case 'memories': setActiveCard('memories'); break;
      case 'about-me': setActiveCard('about-me'); break;
      case 'proactive': setActiveCard('life'); say('提醒和主动关心的设置在这里~', 3000); break;
      case 'bond': setActiveCard('bond'); break;
      case 'settings': setActiveCard('settings'); break;
      case 'help': setActiveCard('help'); break;
      case 'mood': {
        // Emotional message: comfort + auto-journal, no forms to fill.
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
      if (actionType === 'play') playEmote('zoomies', 8000);
    }
  };

  const handlePetTap = () => {
    setPetTapCount(c => c + 1);
    handleAction('pet');
  };

  const startPetting = (pointerId: number, target: HTMLDivElement) => {
    target.setPointerCapture(pointerId);
    if (pettingTimer.current) clearTimeout(pettingTimer.current);
    pettingHandled.current = false;
    setIsPetting(true);
    pettingTimer.current = setTimeout(() => {
      pettingHandled.current = true;
      setIsPetting(false);
      handlePetTap();
    }, 650);
  };

  const finishPetting = () => {
    if (pettingTimer.current) clearTimeout(pettingTimer.current);
    pettingTimer.current = null;
    setIsPetting(false);
    if (!pettingHandled.current) {
      pettingHandled.current = true;
      handlePetTap();
    }
  };

  const cancelPetting = () => {
    if (pettingTimer.current) clearTimeout(pettingTimer.current);
    pettingTimer.current = null;
    pettingHandled.current = true;
    setIsPetting(false);
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

  // ————— Onboarding: choose species, then a breed —————
  if (!character) {
    return <PetOnboarding onChoose={adoptBreed} />;
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
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setActiveCard('life')}
        className="absolute left-3 top-12 z-30 w-[min(55vw,232px)] rounded-2xl p-3 text-left"
        style={{ background: 'rgba(10, 8, 20, 0.76)', border: `1px solid ${color}45`, backdropFilter: 'blur(18px)', boxShadow: `0 10px 30px ${color}18` }}
        aria-label={`打开${displayHubName}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" />
            {displayHubName} · {companionRoles[companionRole].label}在线
          </span>
          <span className="text-[9px] text-violet-200">打开中枢 ›</span>
        </span>
        <span className="mt-1.5 block text-[11px] font-medium leading-snug text-text-primary">
          {pendingLifeItems > 0
            ? `今天还有 ${pendingLifeItems} 项，我会陪你完成。`
            : '今天还没安排，要我帮你规划吗？'}
        </span>
      </motion.button>

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
        <PetScene characterId={character.id} breedId={adoptedBreedId} customBreed={adoptedBreedId === 'custom' ? customPet : generatedModelBreed} size="world" interactive={true} emote={emote} />
      </div>

      {/* Companion controls stay at the right edge so the main Meshy model
          remains the focus of the world instead of being replaced by UI. */}
      <aside
        aria-label="宠物动作栏"
        className="absolute right-3 top-16 z-30 w-32 overflow-hidden rounded-2xl sm:right-5 sm:w-44"
        style={{ background: 'rgba(10, 8, 20, 0.72)', border: `1px solid ${color}55`, backdropFilter: 'blur(16px)', boxShadow: `0 12px 32px ${color}22` }}
      >
        <div className="flex items-center gap-1.5 px-3 pt-3 text-[10px] font-medium" style={{ color }}>
          <Sparkles size={12} />
          3D 陪伴模式
        </div>
        <button
          type="button"
          onClick={handlePetTap}
          className="mx-2.5 my-2.5 flex w-[calc(100%_-_1.25rem)] items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/5"
          style={{ background: `${color}12`, border: `1px solid ${color}24` }}
        >
          <motion.span
            animate={isPetting ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.7, repeat: isPetting ? Infinity : 0 }}
            className="text-xl"
          >
            💗
          </motion.span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-text-primary">
              {isPetting ? `${petName || character.name}正贴着你的手` : `摸摸${petName || character.name}`}
            </span>
            <span className="block text-[9px] text-text-muted">轻点回应 · 按住撒娇</span>
          </span>
        </button>
        <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-3">
          {([
            [null, '待机', '🌿'],
            ['pounce', '扑跳', '⚡'],
            ['zoomies', '玩耍', '🎾'],
            ['rub', '撒娇', '💕'],
          ] as const).map(([name, label, icon]) => (
            <button
              key={label}
              onClick={() => playEmote(name)}
              className="rounded-xl px-1 py-2 text-[10px] text-text-secondary transition-colors hover:text-white"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <span className="block text-base leading-none mb-1">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </aside>


      {/* Pet tap zone + bubble anchor (over the pet's spot in the scene) */}
      <div className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 z-10">
        <div
          className="relative h-48 w-48 cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2"
          role="button"
          tabIndex={0}
          aria-label={`轻点或长按抚摸${petName || character.name}`}
          onPointerDown={event => startPetting(event.pointerId, event.currentTarget)}
          onPointerUp={finishPetting}
          onPointerCancel={cancelPetting}
          onKeyDown={event => {
            if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
              event.preventDefault();
              handlePetTap();
            }
          }}
          style={{ WebkitTapHighlightColor: 'transparent', '--tw-ring-color': color } as CSSProperties}
        >
          <AnimatePresence>
            {isPetting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: [0.35, 0.75, 0.25], scale: 1.08 }}
                exit={{ opacity: 0, scale: 1.18 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-2 rounded-full border-2"
                style={{ borderColor: color, boxShadow: `0 0 32px ${color}55` }}
              />
            )}
          </AnimatePresence>

          {/* Speech bubble */}
          <AnimatePresence>
            {(bubble || isThinking) && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-max max-w-[260px]"
              >
                <div className="px-4 py-2.5 rounded-2xl text-sm backdrop-blur-md relative text-text-primary leading-relaxed"
                  style={{ background: `${color}26`, border: `1px solid ${color}44` }}>
                  {isThinking ? (
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      {petName || character.name}正在想...
                    </motion.span>
                  ) : bubble}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                    style={{ background: `${color}26`, borderRight: `1px solid ${color}44`, borderBottom: `1px solid ${color}44` }} />
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

          <motion.span
            animate={isPetting ? { y: -2, scale: 1.05 } : { y: 0, scale: 1 }}
            className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] text-text-secondary"
            style={{ background: 'rgba(10, 8, 20, 0.68)', border: `1px solid ${color}35`, backdropFilter: 'blur(12px)' }}
          >
            {isPetting ? '再摸一会儿… 💕' : '轻点或按住摸摸'}
          </motion.span>
        </div>
      </div>

      {/* Universal input — the only control in the world */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-2">
        <PlanCard
          plan={plan}
          status={planStatus}
          selected={planSelected}
          onToggle={i => setPlanSelected(sel => sel.map((v, j) => (j === i ? !v : v)))}
          results={planResults}
          onConfirm={() => { void executePlan(); }}
          onCancel={planStatus === 'done' ? closePlan : cancelPlan}
          color={color}
        />
        {/* Contextual suggestion chips */}
        <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {['摸摸头', '陪我玩', '扑跳', '雪原广场', ...getSuggestions({
            hour: new Date().getHours(),
            isCheckedIn,
            lowStat,
            hasClaimableQuest,
          })].filter((chip, index, chips) => chips.indexOf(chip) === index).map(chip => (
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
            placeholder={`告诉${petName || character.name}：提醒、快递、体重或学习…`}
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
      <LifeDashboard
        show={activeCard === 'life'}
        onClose={() => setActiveCard(null)}
        userName={userName}
        petName={petName || character.name}
        hubName={hubName}
        onHubNameChange={setHubName}
        agentRuns={agentRuns}
        extra={(
          <ProactiveCard
            petName={petName || character.name}
            settings={proactive.settings}
            onSettings={proactive.setSettings}
            status={proactive.status}
            upcoming={proactive.upcoming}
            error={proactive.error}
            onEnable={() => { void proactive.enable(); }}
            onDisable={() => { void proactive.disable(); }}
            onTest={() => { void proactive.sendTest(); }}
          />
        )}
        onCommand={command => {
          setActiveCard(null);
          void handleSubmit(command);
        }}
        chatCount={chatCount}
        moodCount={moodEntries.length}
        role={companionRole}
        memoryCount={memories.length}
        onOpenMemories={() => setActiveCard('about-me')}
        onRoleChange={role => {
          setCompanionRole(role);
          say(`好呀，现在我是你的${companionRoles[role].label}。${companionRoles[role].description}`, 4200);
        }}
        items={lifeItems}
        onAdd={item => {
          addLifeItem(item);
          playEmote('cute', 3000);
        }}
        onToggle={id => {
          const completing = !lifeItems.find(item => item.id === id)?.completed;
          toggleLifeItem(id);
          if (completing) {
            addXP(2);
            playEmote('cute', 3000);
            floatReward('完成 +2 XP');
          }
        }}
        onRemove={removeLifeItem}
      />
      <MemoryPanel
        show={activeCard === 'about-me'}
        onClose={() => setActiveCard(null)}
        petName={petName || character.name}
        memories={memories}
        enabled={memoryEnabled}
        onToggleEnabled={setMemoryEnabled}
        onApply={ops => { applyMemories(ops); }}
        onUpdate={updateMemory}
        onRemove={removeMemory}
        onClear={clearMemories}
      />
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
              <label className="text-xs text-text-muted block mb-1.5">OpenAI API Key（本地存储）</label>
              <input
                type="password" defaultValue={apiKey}
                onBlur={e => setApiKey(e.target.value.trim())}
                placeholder="sk-..."
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
