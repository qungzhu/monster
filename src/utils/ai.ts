import type { Character, ChatMessage, MoodType } from '../data/characters';
import { detectEmotion } from './emotion';
import type { Memory, MemoryOp } from '../data/memory';
import type { CompanionRole } from '../data/companion';

// Same-origin: Vite proxies /api to the Express server in dev, so the
// server's own OPENAI_API_KEY works without the user pasting a key.
const API_BASE = '';

/** Extra context that makes the pet "know" its owner. */
export interface ChatContext {
  role?: CompanionRole;
  memoryContext?: string;
  /** An earlier event the pet should naturally ask about. */
  followUp?: string;
}

export interface AIChatResponse {
  response: string;
  isAI: boolean;
}

export async function sendAIMessage(
  message: string,
  character: Character,
  history: ChatMessage[],
  intimacyLevel: number,
  userName: string,
  apiKey: string,
  context: ChatContext = {},
): Promise<AIChatResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({
        message,
        characterId: character.id,
        history: history.slice(-20).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        intimacyLevel,
        userName,
        role: context.role,
        memoryContext: context.memoryContext,
        followUp: context.followUp,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.error === 'no_api_key') {
        return fallbackResponse(message, character);
      }
      throw new Error(err.message || 'API request failed');
    }

    const data = await res.json();
    return { response: data.response, isAI: true };
  } catch {
    return fallbackResponse(message, character);
  }
}

/**
 * LLM memory extraction. Returns null when the server has no key or is
 * unreachable, so the caller can use the offline extractor instead.
 */
export async function extractMemoriesAI(said: string[], memories: Memory[], apiKey: string): Promise<MemoryOp[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/memory/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
      body: JSON.stringify({
        messages: said,
        memories: memories.map(m => ({ id: m.id, text: m.text, category: m.category })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.ops) ? data.ops : null;
  } catch {
    return null;
  }
}

function fallbackResponse(message: string, character: Character): AIChatResponse {
  const mood = detectEmotion(message) as MoodType;
  const responses = (mood && character.chatResponses[mood])
    ? character.chatResponses[mood]
    : character.chatResponses.default;
  const response = responses[Math.floor(Math.random() * responses.length)];
  return { response, isAI: false };
}
