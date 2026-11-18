import type { Character, ChatMessage, MoodType } from '../data/characters';
import { detectEmotion } from './emotion';
import type { Memory, MemoryOp } from '../data/memory';
import type { CompanionRole, LifeItem } from '../data/companion';
// Same-origin on the web (Vite proxies /api to the Express server in dev),
// so the server's own ANTHROPIC_API_KEY works without the user pasting a key.
import { API_BASE, apiHeaders } from './apiBase';

/** Extra context that makes the pet "know" its owner. */
export interface ChatContext {
  role?: CompanionRole;
  memoryContext?: string;
  /** An earlier event the pet should naturally ask about. */
  followUp?: string;
  /**
   * Stream the reply: called with the text so far as it arrives, so the
   * bubble fills in while the model is still writing.
   */
  onDelta?: (textSoFar: string) => void;
}

/** The model's reading of the owner's emotion (mixed feelings: two). */
export interface AIEmotion {
  primary: MoodType;
  secondary?: MoodType;
}

export interface AIChatResponse {
  response: string;
  isAI: boolean;
  emotion?: AIEmotion;
}

const MOODS: MoodType[] = ['happy', 'sad', 'angry', 'anxious', 'lonely', 'neutral'];
function toEmotion(value: unknown): AIEmotion | undefined {
  const v = value as Partial<AIEmotion> | null | undefined;
  if (!v || !MOODS.includes(v.primary as MoodType)) return undefined;
  return { primary: v.primary as MoodType, ...(MOODS.includes(v.secondary as MoodType) ? { secondary: v.secondary } : {}) };
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
  const stream = !!context.onDelta;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: apiHeaders({
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      }),
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
        stream,
      }),
    });
  } catch {
    return fallbackResponse(message, character);
  }
  if (!res.ok) return fallbackResponse(message, character);

  // Older servers ignore `stream` and answer with JSON; handle both.
  if (!stream || !res.body || !(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    try {
      const data = await res.json();
      if (typeof data.response !== 'string' || !data.response) return fallbackResponse(message, character);
      context.onDelta?.(data.response);
      return { response: data.response.trim(), isAI: true, emotion: toEmotion(data.emotion) };
    } catch {
      return fallbackResponse(message, character);
    }
  }

  let text = '';
  let emotion: AIEmotion | undefined;
  try {
    for await (const event of readSSE(res.body)) {
      if (typeof event.delta === 'string') {
        text += event.delta;
        context.onDelta?.(text.trimStart());
      }
      if (event.emotion) emotion = toEmotion(event.emotion);
      if (event.done || event.error) break;
    }
  } catch {
    // Connection dropped mid-reply: keep whatever already arrived.
  }
  if (!text.trim()) return fallbackResponse(message, character);
  return { response: text.trim(), isAI: true, emotion };
}

/** Parse a Server-Sent Events body into its JSON `data:` payloads. */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
        if (!data) continue;
        try { yield JSON.parse(data); } catch { /* skip malformed event */ }
      }
    }
  } finally {
    reader.releaseLock();
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
      headers: apiHeaders({ 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) }),
      body: JSON.stringify({
        messages: said,
        memories: memories.map(m => ({ id: m.id, text: m.text, category: m.category })),
        now: new Date().toString(),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.ops) ? data.ops : null;
  } catch {
    return null;
  }
}

/**
 * LLM task planning. Returns null when the server is unavailable or has no
 * key (use the offline planner); { plan: null } means "not a task".
 */
export async function planWithAI(
  command: string,
  items: LifeItem[],
  memoryContext: string,
  calendarConnected: boolean,
  apiKey: string,
): Promise<{ plan: unknown } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/agent/plan`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) }),
      body: JSON.stringify({
        command,
        now: new Date().toString(),
        items: items.slice(0, 60).map(({ id, type, title, completed, due }) => ({ id, type, title, completed, due })),
        memoryContext,
        calendarConnected,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { plan: data.plan ?? null };
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
