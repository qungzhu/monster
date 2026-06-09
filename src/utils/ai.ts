import type { Character, ChatMessage, MoodType } from '../data/characters';
import { detectEmotion } from './emotion';

const API_BASE = 'http://localhost:3001';

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
): Promise<AIChatResponse> {
  if (!apiKey) {
    return fallbackResponse(message, character);
  }

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
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

function fallbackResponse(message: string, character: Character): AIChatResponse {
  const mood = detectEmotion(message) as MoodType;
  const responses = (mood && character.chatResponses[mood])
    ? character.chatResponses[mood]
    : character.chatResponses.default;
  const response = responses[Math.floor(Math.random() * responses.length)];
  return { response, isAI: false };
}
