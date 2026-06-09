import { useState, useCallback } from 'react';
import type { Character, ChatMessage, MoodEntry, MoodType } from '../data/characters';
import { characters } from '../data/characters';

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

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId) || null;

  const selectCharacter = useCallback((id: string) => {
    setSelectedCharacterId(id);
    saveToStorage(STORAGE_KEYS.selectedCharacter, id);
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
  }, []);

  return {
    selectedCharacter,
    selectedCharacterId,
    selectCharacter,
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
  };
}
