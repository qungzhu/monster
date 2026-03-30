import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Heart, Sparkles } from 'lucide-react';
import type { Character, ChatMessage, MoodType } from '../data/characters';
import { moodEmojis, moodLabels } from '../data/characters';
import { detectEmotion, getTimeOfDay } from '../utils/emotion';
import { TypingIndicator } from '../components/TypingIndicator';
import { IntimacyBar } from '../components/IntimacyBar';

interface ChatPageProps {
  character: Character | null;
  chatHistory: ChatMessage[];
  addMessage: (characterId: string, message: ChatMessage) => void;
  getCharacterResponse: (character: Character, mood?: MoodType) => string;
  intimacyLevel: number;
  addIntimacy: (characterId: string, amount: number) => void;
  userName: string;
}

const moodOptions: MoodType[] = ['happy', 'sad', 'angry', 'anxious', 'lonely'];

export function ChatPage({
  character,
  chatHistory,
  addMessage,
  getCharacterResponse,
  intimacyLevel,
  addIntimacy,
  userName,
}: ChatPageProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping, scrollToBottom]);

  // Send initial greeting if no chat history
  useEffect(() => {
    if (character && chatHistory.length === 0) {
      const timeOfDay = getTimeOfDay();
      const dailyMessages = character.dailyMessages[timeOfDay];
      const greeting = dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
      const personalGreeting = userName ? greeting.replace(/你/, `${userName}，你`) : greeting;

      setTimeout(() => {
        addMessage(character.id, {
          id: `${Date.now()}`,
          role: 'character',
          content: personalGreeting,
          timestamp: Date.now(),
        });
      }, 800);
    }
  }, [character?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!character) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center">
          <Sparkles size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">请先选择一位伴侣</p>
          <p className="text-text-muted text-sm mt-1">回到首页选择你的专属陪伴</p>
        </div>
      </div>
    );
  }

  const sendMessage = (content: string, mood?: MoodType) => {
    if (!content.trim()) return;

    const detectedMood = mood || detectEmotion(content);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      emotion: detectedMood !== ('default' as MoodType) ? detectedMood : undefined,
    };
    addMessage(character.id, userMessage);
    setInput('');
    setShowMoodPicker(false);

    // Simulate typing delay
    setIsTyping(true);
    const delay = 1000 + Math.random() * 2000;

    setTimeout(() => {
      const response = getCharacterResponse(character, detectedMood as MoodType);
      const personalResponse = userName ? response.replace(/你/g, (_, i) => i === 0 ? `${userName}你` : '你') : response;

      const charMessage: ChatMessage = {
        id: `char-${Date.now()}`,
        role: 'character',
        content: personalResponse,
        timestamp: Date.now(),
      };
      addMessage(character.id, charMessage);
      addIntimacy(character.id, 2);
      setIsTyping(false);
    }, delay);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleMoodSelect = (mood: MoodType) => {
    const moodMessage = `我现在感觉${moodLabels[mood]}...`;
    sendMessage(moodMessage, mood);
  };

  const themeColor = character.theme === 'xinghui' ? '#e91e8c' :
    character.theme === 'lishen' ? '#4f46e5' : '#ea580c';

  return (
    <div className={`h-full flex flex-col theme-${character.theme}`}>
      {/* Chat Header */}
      <div className="glass-strong px-4 py-3 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11)`,
            border: `1px solid ${themeColor}44`,
          }}
        >
          {character.avatar}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-sm">{character.name}</h2>
          <div className="w-32">
            <IntimacyBar level={intimacyLevel} maxLevel={character.maxIntimacy} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          在线
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {chatHistory.map(message => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'character' && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 shrink-0 mt-1"
                  style={{
                    background: `${themeColor}22`,
                    border: `1px solid ${themeColor}33`,
                  }}
                >
                  {character.avatar}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary/20 rounded-tr-sm'
                    : 'glass rounded-tl-sm'
                }`}
                style={message.role === 'user' ? {
                  background: `${themeColor}22`,
                  border: `1px solid ${themeColor}22`,
                } : undefined}
              >
                <p className="text-sm leading-relaxed text-text-primary">{message.content}</p>
                {message.emotion && (
                  <span className="text-xs text-text-muted mt-1 block">
                    {moodEmojis[message.emotion]} {moodLabels[message.emotion]}
                  </span>
                )}
                <span className="text-[10px] text-text-muted mt-1 block text-right">
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 shrink-0"
              style={{
                background: `${themeColor}22`,
                border: `1px solid ${themeColor}33`,
              }}
            >
              {character.avatar}
            </div>
            <div className="glass rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mood Picker */}
      <AnimatePresence>
        {showMoodPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden glass"
          >
            <div className="px-4 py-3">
              <p className="text-xs text-text-muted mb-2">现在的心情是...</p>
              <div className="flex gap-2 justify-center">
                {moodOptions.map(mood => (
                  <button
                    key={mood}
                    onClick={() => handleMoodSelect(mood)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-surface-lighter transition-colors"
                  >
                    <span className="text-2xl">{moodEmojis[mood]}</span>
                    <span className="text-[10px] text-text-muted">{moodLabels[mood]}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="glass-strong px-4 py-3 pb-20">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMoodPicker(!showMoodPicker)}
            className={`p-2 rounded-xl transition-colors ${showMoodPicker ? 'bg-primary/20' : 'hover:bg-surface-lighter'}`}
          >
            <Smile size={20} className="text-text-muted" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`对${character.name}说些什么...`}
            className="flex-1 bg-surface-light rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/20 transition-colors"
          />
          <motion.button
            type="submit"
            disabled={!input.trim()}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-xl transition-colors disabled:opacity-30"
            style={{ background: input.trim() ? `${themeColor}33` : undefined }}
          >
            <Send size={18} style={{ color: input.trim() ? themeColor : undefined }} className={input.trim() ? '' : 'text-text-muted'} />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (character) {
                addIntimacy(character.id, 1);
              }
            }}
            className="p-2 rounded-xl hover:bg-surface-lighter transition-colors"
          >
            <Heart size={18} className="text-pink-400" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
