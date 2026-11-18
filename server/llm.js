// Claude calls for the API server: chat (plain or streamed), structured
// JSON, and vision. One place for the model, effort and refusal handling.
//
// Env: ANTHROPIC_API_KEY (or a per-request X-API-Key), CLAUDE_MODEL.
import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

// If a safety classifier declines a request, the API re-runs it on
// Anthropic's recommended fallback model instead of returning a refusal.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export function claudeKey(req) {
  return req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY || '';
}

export function claudeClient(apiKey) {
  return new Anthropic({ apiKey });
}

const textOf = message => message.content
  .filter(block => block.type === 'text')
  .map(block => block.text)
  .join('');

/**
 * One reply. `effort` trades depth for speed: chat runs at 'low' so the
 * pet answers quickly; thinking is adaptive (always on for this model).
 * Returns '' when the request was refused.
 */
export async function generateText(client, { system, messages, effort = 'low', maxTokens = 4000 }) {
  const message = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort },
    ...FALLBACK,
  });
  if (message.stop_reason === 'refusal') return '';
  return textOf(message);
}

/**
 * Streamed reply: yields text deltas as they arrive. Stops quietly when
 * the request is refused (the caller then falls back).
 */
export async function* streamText(client, { system, messages, effort = 'low', maxTokens = 4000, signal }) {
  const stream = client.beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort },
    ...FALLBACK,
  }, { signal });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

/**
 * JSON that matches `schema` (structured outputs). Returns null when the
 * request is refused or the output can't be parsed.
 */
export async function generateJSON(client, { system, content, schema, effort = 'low', maxTokens = 4000 }) {
  const message = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort, format: { type: 'json_schema', schema } },
    ...FALLBACK,
  });
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') return null;
  try {
    return JSON.parse(textOf(message));
  } catch {
    return null;
  }
}

// ——— Emotion tag ———
// The chat prompt asks the model to end every reply with
// <mood>primary[,secondary]</mood>. The tag is stripped before the owner
// sees the reply and returned separately, so the pet's own reading of the
// emotion drives the mood journal and its body language.

export const MOODS = ['happy', 'sad', 'angry', 'anxious', 'lonely', 'neutral'];

export const MOOD_TAG_RULE = `- 回复最后另起一行,写上你判断的主人此刻的情绪标签:<mood>主情绪</mood>,有混合情绪时写 <mood>主情绪,次情绪</mood>。只能从 ${MOODS.join(' / ')} 中选。看清否定和反话("不是不开心"、"开心不起来")。这一行主人看不到,不要在正文里提到它`;

const MOOD_TAG = /<mood>\s*([a-z ,]+?)\s*<\/mood>/i;

export function parseMood(raw) {
  const match = MOOD_TAG.exec(raw);
  if (!match) return null;
  const [primary, secondary] = match[1].split(',').map(s => s.trim().toLowerCase());
  if (!MOODS.includes(primary)) return null;
  return {
    primary,
    ...(secondary && secondary !== primary && MOODS.includes(secondary) ? { secondary } : {}),
  };
}

export const stripMood = raw => raw.replace(MOOD_TAG, '').replace(/<\/?mood>?$/i, '').trim();

/**
 * Wraps a delta sink so the mood tag never reaches the client: text from
 * the first "<" on is held back until it is clearly not the tag (or the
 * stream ends).
 */
export function moodFilter(emit) {
  let held = '';
  let all = '';
  return {
    push(delta) {
      all += delta;
      held += delta;
      const lt = held.indexOf('<');
      if (lt === -1) {
        emit(held);
        held = '';
        return;
      }
      if (lt > 0) emit(held.slice(0, lt));
      held = held.slice(lt);
      // Not the start of "<mood>" after all: release it.
      if (held.length >= 6 && !held.toLowerCase().startsWith('<mood>')) {
        emit(held);
        held = '';
      }
    },
    end() {
      const mood = parseMood(all);
      const rest = stripMood(held);
      if (rest) emit(rest);
      return { mood, text: stripMood(all) };
    },
  };
}
