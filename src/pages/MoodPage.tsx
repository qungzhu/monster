import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookHeart, Plus, X } from 'lucide-react';
import type { Character, MoodEntry, MoodType } from '../data/characters';
import { moodEmojis, moodLabels, moodColors } from '../data/characters';

interface MoodPageProps {
  character: Character | null;
  moodEntries: MoodEntry[];
  addMoodEntry: (entry: MoodEntry) => void;
  getCharacterResponse: (character: Character, mood?: MoodType) => string;
  addIntimacy: (characterId: string, amount: number) => void;
}

const allMoods: MoodType[] = ['happy', 'sad', 'angry', 'anxious', 'lonely', 'neutral'];

export function MoodPage({
  character,
  moodEntries,
  addMoodEntry,
  getCharacterResponse,
  addIntimacy,
}: MoodPageProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!selectedMood || !character) return;

    const response = getCharacterResponse(character, selectedMood === 'neutral' ? undefined : selectedMood);

    const entry: MoodEntry = {
      id: `mood-${Date.now()}`,
      date: new Date().toISOString(),
      mood: selectedMood,
      note: note.trim(),
      characterId: character.id,
      characterResponse: response,
    };

    addMoodEntry(entry);
    addIntimacy(character.id, 3);
    setShowAdd(false);
    setSelectedMood(null);
    setNote('');
  };

  const themeColor = character?.theme === 'xinghui' ? '#e91e8c' :
    character?.theme === 'lishen' ? '#4f46e5' : '#ea580c';

  return (
    <div className={`h-full overflow-y-auto pb-20 ${character ? `theme-${character.theme}` : ''}`}>
      <div className="px-6 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BookHeart size={22} style={{ color: themeColor || '#e91e8c' }} />
              心情日记
            </h1>
            <p className="text-text-muted text-xs mt-1">记录你的每一刻心情</p>
          </div>
          {character && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAdd(!showAdd)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${themeColor}22`, border: `1px solid ${themeColor}33` }}
            >
              {showAdd ? <X size={18} style={{ color: themeColor }} /> : <Plus size={18} style={{ color: themeColor }} />}
            </motion.button>
          )}
        </motion.div>

        {/* Add Mood Form */}
        <AnimatePresence>
          {showAdd && character && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="glass rounded-2xl p-5">
                <p className="text-sm text-text-secondary mb-3">现在的心情是...</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {allMoods.map(mood => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(mood)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                        selectedMood === mood ? 'scale-105' : 'hover:bg-surface-lighter'
                      }`}
                      style={selectedMood === mood ? {
                        background: `${moodColors[mood]}22`,
                        border: `1px solid ${moodColors[mood]}44`,
                        boxShadow: `0 0 15px ${moodColors[mood]}15`,
                      } : undefined}
                    >
                      <span className="text-2xl">{moodEmojis[mood]}</span>
                      <span className="text-xs text-text-muted">{moodLabels[mood]}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="写下此刻的想法..."
                  className="w-full bg-surface-light rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/20 transition-colors resize-none h-24"
                />

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!selectedMood}
                  className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-30 transition-opacity"
                  style={{ background: selectedMood ? themeColor : '#555' }}
                >
                  记录心情
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mood Entries */}
        {!character && (
          <div className="text-center py-20">
            <BookHeart size={48} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">请先选择一位伴侣</p>
          </div>
        )}

        {character && moodEntries.length === 0 && !showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <BookHeart size={48} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">还没有心情记录</p>
            <p className="text-text-muted text-sm mt-1">点击右上角的+开始记录</p>
          </motion.div>
        )}

        <div className="space-y-3 pb-4">
          {moodEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${moodColors[entry.mood]}22` }}
                >
                  {moodEmojis[entry.mood]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: moodColors[entry.mood] }}>
                      {moodLabels[entry.mood]}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(entry.date).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="text-text-secondary text-sm mb-2">{entry.note}</p>
                  )}
                  {/* Character response */}
                  <div
                    className="rounded-xl p-3 mt-2"
                    style={{ background: `${themeColor}11`, border: `1px solid ${themeColor}15` }}
                  >
                    <p className="text-xs text-text-muted mb-1">
                      {character?.name ?? ''}的回复:
                    </p>
                    <p className="text-sm text-text-secondary">{entry.characterResponse}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
