import { useState, useCallback } from 'react';
import type { Character, ChatMessage, MoodEntry, MoodType } from '../data/characters';
import { characters } from '../data/characters';
import type { PetStats } from '../data/gameConfig';
import { DEFAULT_PET_STATS, STAT_DECAY_PER_HOUR, getLevelFromXP, shopItems, petReactions } from '../data/gameConfig';
import { getBreed, characterDefaultBreed } from '../data/breeds';

const STORAGE_KEYS = {
  selectedCharacter: 'fp-selected-character',
  chatHistory: 'fp-chat-history',
  moodEntries: 'fp-mood-entries',
  intimacyLevels: 'fp-intimacy-levels',
  userName: 'fp-user-name',
  checkedInToday: 'fp-checked-in',
  apiKey: 'fp-api-key',
  checkInStreak: 'fp-check-in-streak',
  lastCheckInDate: 'fp-last-check-in-date',
  coins: 'fp-coins',
  xp: 'fp-xp',
  petStats: 'fp-pet-stats',
  questProgress: 'fp-quest-progress',
  lastStatDecay: 'fp-last-stat-decay',
  inventory: 'fp-inventory',
  adoptedBreed: 'fp-adopted-breed',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toDateString();
}

export function useAppStore() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    loadFromStorage(STORAGE_KEYS.selectedCharacter, null)
  );
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>(
    loadFromStorage(STORAGE_KEYS.chatHistory, {})
  );
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(
    loadFromStorage(STORAGE_KEYS.moodEntries, [])
  );
  const [intimacyLevels, setIntimacyLevels] = useState<Record<string, number>>(
    loadFromStorage(STORAGE_KEYS.intimacyLevels, {})
  );
  const [userName, setUserNameState] = useState<string>(
    loadFromStorage(STORAGE_KEYS.userName, '')
  );
  const [checkedInToday, setCheckedInToday] = useState<string>(
    loadFromStorage(STORAGE_KEYS.checkedInToday, '')
  );
  const [apiKey, setApiKeyState] = useState<string>(
    loadFromStorage(STORAGE_KEYS.apiKey, '')
  );
  const [checkInStreak, setCheckInStreak] = useState<number>(
    loadFromStorage(STORAGE_KEYS.checkInStreak, 0)
  );
  const [lastCheckInDate, setLastCheckInDate] = useState<string>(
    loadFromStorage(STORAGE_KEYS.lastCheckInDate, '')
  );

  // Game state
  const [coins, setCoins] = useState<number>(
    loadFromStorage(STORAGE_KEYS.coins, 50)
  );
  const [xp, setXP] = useState<number>(
    loadFromStorage(STORAGE_KEYS.xp, 0)
  );
  const [petStats, setPetStats] = useState<Record<string, PetStats>>(
    loadFromStorage(STORAGE_KEYS.petStats, {})
  );
  const [questProgress, setQuestProgress] = useState<Record<string, number>>(
    loadFromStorage(STORAGE_KEYS.questProgress, {})
  );
  const [lastStatDecay, setLastStatDecay] = useState<number>(
    loadFromStorage(STORAGE_KEYS.lastStatDecay, Date.now())
  );
  const [inventory, setInventory] = useState<Record<string, number>>(
    loadFromStorage(STORAGE_KEYS.inventory, {})
  );

  const [adoptedBreedId, setAdoptedBreedId] = useState<string | null>(
    loadFromStorage(STORAGE_KEYS.adoptedBreed, null)
  );

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId) || null;
  const adoptedBreed = getBreed(adoptedBreedId);
  /** Display name: the adopted breed's pet name, falling back to the base character. */
  const petName = adoptedBreed?.petName ?? selectedCharacter?.name ?? '';

  const selectCharacter = useCallback((id: string) => {
    setSelectedCharacterId(id);
    saveToStorage(STORAGE_KEYS.selectedCharacter, id);
    // Quick-start picks map to their default breed so visuals stay consistent
    const defaultBreed = characterDefaultBreed[id];
    if (defaultBreed) {
      setAdoptedBreedId(defaultBreed);
      saveToStorage(STORAGE_KEYS.adoptedBreed, defaultBreed);
    }
  }, []);

  /** Adopt a breed: sets both the visual breed and its personality character. */
  const adoptBreed = useCallback((breedId: string) => {
    const breed = getBreed(breedId);
    if (!breed) return;
    setAdoptedBreedId(breedId);
    saveToStorage(STORAGE_KEYS.adoptedBreed, breedId);
    setSelectedCharacterId(breed.characterId);
    saveToStorage(STORAGE_KEYS.selectedCharacter, breed.characterId);
  }, []);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    saveToStorage(STORAGE_KEYS.userName, name);
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    saveToStorage(STORAGE_KEYS.apiKey, key);
  }, []);

  const addMessage = useCallback((characterId: string, message: ChatMessage) => {
    setChatHistories(prev => {
      const updated = {
        ...prev,
        [characterId]: [...(prev[characterId] || []), message],
      };
      saveToStorage(STORAGE_KEYS.chatHistory, updated);
      return updated;
    });
  }, []);

  const getCharacterResponse = useCallback((character: Character, mood?: MoodType): string => {
    const responses = mood && character.chatResponses[mood]
      ? character.chatResponses[mood]
      : character.chatResponses.default;
    return responses[Math.floor(Math.random() * responses.length)];
  }, []);

  const addIntimacy = useCallback((characterId: string, amount: number) => {
    setIntimacyLevels(prev => {
      const current = prev[characterId] || 0;
      const updated = { ...prev, [characterId]: Math.min(current + amount, 100) };
      saveToStorage(STORAGE_KEYS.intimacyLevels, updated);
      return updated;
    });
  }, []);

  const addMoodEntry = useCallback((entry: MoodEntry) => {
    setMoodEntries(prev => {
      const updated = [entry, ...prev];
      saveToStorage(STORAGE_KEYS.moodEntries, updated);
      return updated;
    });
  }, []);

  const checkIn = useCallback(() => {
    const today = new Date().toDateString();
    let newStreak: number;
    if (isYesterday(lastCheckInDate)) {
      newStreak = checkInStreak + 1;
    } else if (lastCheckInDate === today) {
      newStreak = checkInStreak;
    } else {
      newStreak = 1;
    }

    setCheckedInToday(today);
    setCheckInStreak(newStreak);
    setLastCheckInDate(today);
    saveToStorage(STORAGE_KEYS.checkedInToday, today);
    saveToStorage(STORAGE_KEYS.checkInStreak, newStreak);
    saveToStorage(STORAGE_KEYS.lastCheckInDate, today);
    return newStreak;
  }, [lastCheckInDate, checkInStreak]);

  const isCheckedIn = checkedInToday === new Date().toDateString();

  const getCheckInReward = useCallback(() => {
    const streakBonus = Math.min(checkInStreak * 2, 10);
    return 5 + streakBonus;
  }, [checkInStreak]);

  // Game methods
  const addCoins = useCallback((amount: number) => {
    setCoins(prev => {
      const updated = prev + amount;
      saveToStorage(STORAGE_KEYS.coins, updated);
      return updated;
    });
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    if (coins < amount) return false;
    setCoins(prev => {
      const updated = prev - amount;
      saveToStorage(STORAGE_KEYS.coins, updated);
      return updated;
    });
    return true;
  }, [coins]);

  const addXP = useCallback((amount: number) => {
    setXP(prev => {
      const updated = prev + amount;
      saveToStorage(STORAGE_KEYS.xp, updated);
      return updated;
    });
  }, []);

  const levelInfo = getLevelFromXP(xp);

  const getPetStats = useCallback((characterId: string): PetStats => {
    const stats = petStats[characterId] || { ...DEFAULT_PET_STATS };
    const now = Date.now();
    const hoursPassed = (now - lastStatDecay) / (1000 * 60 * 60);
    if (hoursPassed >= 1) {
      const decay = Math.floor(hoursPassed) * STAT_DECAY_PER_HOUR;
      return {
        hunger: Math.max(0, stats.hunger - decay),
        mood: Math.max(0, stats.mood - decay),
        cleanliness: Math.max(0, stats.cleanliness - decay),
      };
    }
    return stats;
  }, [petStats, lastStatDecay]);

  const updatePetStat = useCallback((characterId: string, stat: keyof PetStats, amount: number) => {
    setPetStats(prev => {
      const current = prev[characterId] || { ...DEFAULT_PET_STATS };
      const updated = {
        ...prev,
        [characterId]: {
          ...current,
          [stat]: Math.min(100, Math.max(0, current[stat] + amount)),
        },
      };
      saveToStorage(STORAGE_KEYS.petStats, updated);
      return updated;
    });
    setLastStatDecay(Date.now());
    saveToStorage(STORAGE_KEYS.lastStatDecay, Date.now());
  }, []);

  const updateQuestProgress = useCallback((questType: string, amount: number = 1) => {
    const today = new Date().toDateString();
    setQuestProgress(prev => {
      const key = `${today}-${questType}`;
      const current = prev[key] || 0;
      const updated = { ...prev, [key]: current + amount };
      saveToStorage(STORAGE_KEYS.questProgress, updated);
      return updated;
    });
  }, []);

  const getQuestProgress = useCallback((questType: string): number => {
    const today = new Date().toDateString();
    const key = `${today}-${questType}`;
    return questProgress[key] || 0;
  }, [questProgress]);

  const buyItem = useCallback((itemId: string): boolean => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item || coins < item.price) return false;
    setCoins(prev => {
      const updated = prev - item.price;
      saveToStorage(STORAGE_KEYS.coins, updated);
      return updated;
    });
    setInventory(prev => {
      const updated = { ...prev, [itemId]: (prev[itemId] || 0) + 1 };
      saveToStorage(STORAGE_KEYS.inventory, updated);
      return updated;
    });
    return true;
  }, [coins]);

  const useItem = useCallback((itemId: string, characterId: string): string | null => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item || (inventory[itemId] || 0) <= 0) return null;

    setInventory(prev => {
      const updated = { ...prev, [itemId]: (prev[itemId] || 0) - 1 };
      saveToStorage(STORAGE_KEYS.inventory, updated);
      return updated;
    });

    updatePetStat(characterId, item.effect.stat, item.effect.amount);

    const actionType = item.type === 'food' ? 'feed' : item.type === 'toy' ? 'play' : 'clean';
    const reactions = petReactions[characterId]?.[actionType] || ['...'];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }, [inventory, updatePetStat]);

  const getReaction = useCallback((characterId: string, action: string): string => {
    const reactions = petReactions[characterId]?.[action] || ['...'];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }, []);

  const clearAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setSelectedCharacterId(null);
    setChatHistories({});
    setMoodEntries([]);
    setIntimacyLevels({});
    setUserNameState('');
    setCheckedInToday('');
    setApiKeyState('');
    setCheckInStreak(0);
    setLastCheckInDate('');
    setCoins(50);
    setXP(0);
    setPetStats({});
    setQuestProgress({});
    setInventory({});
    setAdoptedBreedId(null);
  }, []);

  return {
    selectedCharacter,
    selectedCharacterId,
    selectCharacter,
    adoptedBreedId,
    adoptedBreed,
    adoptBreed,
    petName,
    chatHistories,
    addMessage,
    getCharacterResponse,
    moodEntries,
    addMoodEntry,
    intimacyLevels,
    addIntimacy,
    userName,
    setUserName,
    isCheckedIn,
    checkIn,
    checkInStreak,
    getCheckInReward,
    clearAllData,
    characters,
    apiKey,
    setApiKey,
    // Game state
    coins,
    addCoins,
    spendCoins,
    xp,
    addXP,
    levelInfo,
    getPetStats,
    updatePetStat,
    questProgress,
    updateQuestProgress,
    getQuestProgress,
    inventory,
    buyItem,
    useItem,
    getReaction,
  };
}
