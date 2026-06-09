import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, ChevronUp, Bot } from 'lucide-react';
import type { Character, ChatMessage, MoodType } from '../data/characters';
import { moodEmojis, moodLabels } from '../data/characters';
import { detectEmotion, getTimeOfDay } from '../utils/emotion';
import { sendAIMessage } from '../utils/ai';
import { PetScene } from '../components/pets/PetScene';

interface ChatPageProps {
  character: Character | null;
  chatHistory: ChatMessage[];
  addMessage: (characterId: string, message: ChatMessage) => void;
  getCharacterResponse: (character: Character, mood?: MoodType) => string;
  intimacyLevel: number;
  addIntimacy: (characterId: string, amount: number) => void;
  userName: string;
  apiKey: string;
  addXP: (n: number) => void;
  addCoins: (n: number) => void;
  updateQuestProgress: (type: string, amount?: number) => void;
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
  apiKey,
  addXP,
  addCoins,
  updateQuestProgress,
}: ChatPageProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [isAIMode, setIsAIMode] = useState(!!apiKey);
  const [showHistory, setShowHistory] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isRevealing, setIsRevealing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastCharMessage = chatHistory.filter(m => m.role === 'character').slice(-1)[0];
  const lastUserMessage = chatHistory.filter(m => m.role === 'user').slice(-1)[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping, scrollToBottom]);

  // Typewriter effect for latest character message
  useEffect(() => {
    if (!lastCharMessage) return;
    const text = lastCharMessage.content;
    setIsRevealing(true);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsRevealing(false);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [lastCharMessage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (character && chatHistory.length === 0) {
      const timeOfDay = getTimeOfDay();
      const dailyMessages = character.dailyMessages[timeOfDay];
      const greeting = dailyMessages[Math.floor(Math.random() * dailyMessages.length)];
      setTimeout(() => {
        addMessage(character.id, {
          id: `${Date.now()}`,
          role: 'character',
          content: greeting,
          timestamp: Date.now(),
        });
      }, 800);
    }
  }, [character?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsAIMode(!!apiKey);
  }, [apiKey]);

  if (!character) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center">
          <span className="text-5xl block mb-4">💬</span>
          <p className="text-text-secondary">请先选择一只小可爱</p>
          <p className="text-text-muted text-sm mt-1">回到首页选择你的萌宠伙伴</p>
        </div>
      </div>
    );
  }

  const themeColor = character.theme === 'tuantuan' ? '#d97706' :
    character.theme === 'xiaoxue' ? '#7c3aed' : '#ec4899';

  const sendMessage = async (content: string, mood?: MoodType) => {
    if (!content.trim() || isTyping) return;

    const detectedMood = mood || detectEmotion(content);
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
    setIsTyping(true);

    updateQuestProgress('chat');
    addXP(5);
    addCoins(2);

    if (isAIMode && apiKey) {
      try {
        const result = await sendAIMessage(content, character, chatHistory, intimacyLevel, userName, apiKey);
        addMessage(character.id, {
          id: `char-${Date.now()}`,
          role: 'character',
          content: result.response,
          timestamp: Date.now(),
        });
        addIntimacy(character.id, 2);
      } catch {
        const response = getCharacterResponse(character, detectedMood as MoodType);
        addMessage(character.id, {
          id: `char-${Date.now()}`,
          role: 'character',
          content: response,
          timestamp: Date.now(),
        });
        addIntimacy(character.id, 2);
      }
      setIsTyping(false);
    } else {
      const delay = 1000 + Math.random() * 2000;
      setTimeout(() => {
        const response = getCharacterResponse(character, detectedMood as MoodType);
        addMessage(character.id, {
          id: `char-${Date.now()}`,
          role: 'character',
          content: response,
          timestamp: Date.now(),
        });
        addIntimacy(character.id, 2);
        setIsTyping(false);
      }, delay);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleMoodSelect = (mood: MoodType) => {
    const moodMessage = `我现在感觉${moodLabels[mood]}...`;
    sendMessage(moodMessage, mood);
  };

  const skipReveal = () => {
    if (isRevealing && lastCharMessage) {
      setDisplayedText(lastCharMessage.content);
      setIsRevealing(false);
    }
  };

  return (
    <div className={`h-full flex flex-col relative overflow-hidden theme-${character.theme}`}>
      {/* Background scene */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${themeColor}12 0%, transparent 60%), linear-gradient(180deg, #0d0a08 0%, #1a1025 50%, #0d0a08 100%)`,
        }}
      />

      {/* Character name bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{character.avatar}</span>
          <span className="text-sm font-bold text-text-primary">{character.name}</span>
          {isAIMode && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${themeColor}22`, color: themeColor }}>
              <Bot size={9} /> AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> 在线
        </div>
      </div>

      {/* Character display area */}
      <div className="flex-1 relative z-10 flex items-center justify-center" onClick={skipReveal}>
        {/* 3D Pet - offset to the left like a VN character */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-20 left-4"
        >
          <PetScene characterId={character.id} size="medium" interactive={false} />
        </motion.div>

        {/* History toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-2 right-3 glass rounded-full px-3 py-1 text-[10px] text-text-muted flex items-center gap-1"
        >
          <ChevronUp size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          对话记录
        </motion.button>

        {/* Chat history overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-3 top-10 bottom-4 z-20 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10, 8, 20, 0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="h-full overflow-y-auto p-4 space-y-3">
                {chatHistory.map(message => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        message.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                      }`}
                      style={{
                        background: message.role === 'user' ? `${themeColor}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${message.role === 'user' ? `${themeColor}22` : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <p className="text-xs leading-relaxed text-text-primary">{message.content}</p>
                      {message.emotion && (
                        <span className="text-[10px] text-text-muted">{moodEmojis[message.emotion]} {moodLabels[message.emotion]}</span>
                      )}
                      <span className="text-[9px] text-text-muted block text-right mt-0.5">
                        {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visual Novel dialogue box */}
      <div className="relative z-20">
        {/* Last user message label */}
        {lastUserMessage && (
          <div className="px-5 mb-1 flex justify-end">
            <span className="text-[10px] text-text-muted bg-white/5 rounded-full px-2 py-0.5">
              {lastUserMessage.content.length > 30 ? lastUserMessage.content.slice(0, 30) + '...' : lastUserMessage.content}
            </span>
          </div>
        )}

        {/* Dialogue display */}
        <div
          className="mx-3 rounded-t-2xl p-4 min-h-[100px]"
          style={{
            background: 'linear-gradient(180deg, rgba(20, 15, 35, 0.95) 0%, rgba(15, 10, 25, 0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderBottom: 'none',
          }}
          onClick={skipReveal}
        >
          {/* Character name tag */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="px-2 py-0.5 rounded-md text-xs font-bold"
              style={{ background: `${themeColor}33`, color: themeColor }}
            >
              {character.name}
            </div>
            <div className="flex-1 h-px" style={{ background: `${themeColor}33` }} />
          </div>

          {/* Dialogue text with typewriter */}
          <div className="min-h-[48px]">
            {isTyping ? (
              <div className="flex items-center gap-1">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-sm text-text-secondary"
                >
                  {character.name}正在思考
                </motion.span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-text-muted"
                >
                  ...
                </motion.span>
              </div>
            ) : lastCharMessage ? (
              <p className="text-sm leading-relaxed text-text-primary">
                {displayedText}
                {isRevealing && (
                  <motion.span
                    animate={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                    className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                    style={{ background: themeColor }}
                  />
                )}
              </p>
            ) : (
              <p className="text-sm text-text-muted">和{character.name}说些什么吧...</p>
            )}
          </div>

          {!isRevealing && !isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end mt-1"
            >
              <motion.span
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-text-muted text-xs"
              >
                ▼
              </motion.span>
            </motion.div>
          )}
        </div>

        {/* Mood picker */}
        <AnimatePresence>
          {showMoodPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mx-3"
              style={{ background: 'rgba(20, 15, 35, 0.95)', borderLeft: '1px solid rgba(255,255,255,0.12)', borderRight: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="px-4 py-3">
                <p className="text-[10px] text-text-muted mb-2">选择当前心情...</p>
                <div className="flex gap-2 justify-center">
                  {moodOptions.map(mood => (
                    <button
                      key={mood}
                      onClick={() => handleMoodSelect(mood)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <span className="text-xl">{moodEmojis[mood]}</span>
                      <span className="text-[9px] text-text-muted">{moodLabels[mood]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          className="mx-3 rounded-b-2xl px-4 py-3 pb-20"
          style={{
            background: 'rgba(15, 10, 25, 0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className={`p-2 rounded-xl transition-colors ${showMoodPicker ? 'bg-white/15' : 'hover:bg-white/10'}`}
            >
              <Smile size={18} className="text-text-muted" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`对${character.name}说些什么...`}
              className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none border border-white/10 focus:border-white/20 transition-colors"
              disabled={isTyping}
            />
            <motion.button
              type="submit"
              disabled={!input.trim() || isTyping}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-xl transition-colors disabled:opacity-30"
              style={{ background: input.trim() ? `${themeColor}33` : undefined }}
            >
              <Send size={16} style={{ color: input.trim() ? themeColor : undefined }} className={input.trim() ? '' : 'text-text-muted'} />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
