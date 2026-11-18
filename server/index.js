import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mountSchedule } from './schedule.js';
import { MAX_SAVE_BYTES, mountSaves } from './saves.js';
import { corsOptions, isMeshyAssetUrl, rateLimit, requireAppToken } from './guard.js';
import { CRISIS_RESOURCES, SAFETY_RULES, isCrisisMessage } from './safety.js';
import { MOOD_TAG_RULE, claudeClient, claudeKey, generateJSON, generateText, moodFilter, parseMood, stripMood, streamText } from './llm.js';
import {
  buildGoogleAuthorizationUrl,
  createGoogleCalendarEvent,
  decryptGoogleToken,
  encryptGoogleToken,
  exchangeGoogleAuthorizationCode,
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from '../worker/googleCalendar.js';

dotenv.config();

const app = express();
// Behind a reverse proxy (the server itself listens on 127.0.0.1), so take
// the client IP for rate limiting from X-Forwarded-For.
app.set('trust proxy', 'loopback');
app.use(cors(corsOptions()));
// Photo uploads carry base64 images; everything else stays small.
const IMAGE_ROUTES = new Set(['/api/analyze-pet', '/api/meshy/generate']);
const imageJson = express.json({ limit: '25mb' });
const smallJson = express.json({ limit: '256kb' });
const saveJson = express.json({ limit: MAX_SAVE_BYTES });
app.use((req, res, next) => (IMAGE_ROUTES.has(req.path) ? imageJson : req.path === '/api/save' ? saveJson : smallJson)(req, res, next));
mountSchedule(app);

// Paid endpoints: optional app token + per-IP limits.
const appToken = requireAppToken();
const MINUTE = 60_000;
const aiLimit = rateLimit({ windowMs: MINUTE, max: Number(process.env.AI_RATE_LIMIT_PER_MIN) || 20 });
const aiDailyLimit = rateLimit({ windowMs: 24 * 60 * MINUTE, max: Number(process.env.AI_RATE_LIMIT_PER_DAY) || 600 });
const meshyLimit = rateLimit({ windowMs: 60 * MINUTE, max: Number(process.env.MESHY_RATE_LIMIT_PER_HOUR) || 6 });
const meshyPollLimit = rateLimit({ windowMs: MINUTE, max: 60 });
for (const route of ['/api/chat', '/api/analyze-pet', '/api/agent/plan', '/api/memory/extract']) {
  app.use(route, appToken, aiLimit, aiDailyLimit);
}
app.use('/api/meshy/generate', appToken, meshyLimit);
app.use('/api/meshy/status', appToken, meshyPollLimit);
app.use('/api/meshy/fetch-model', appToken, meshyPollLimit);
// Cloud saves: a guessed code is a stolen save, so wrong codes are capped.
app.use('/api/save', appToken, rateLimit({ windowMs: MINUTE, max: Number(process.env.SAVE_RATE_LIMIT_PER_MIN) || 30 }));
mountSaves(app);

const PORT = process.env.PORT || 3001;
const localGoogleStates = new Map();
const localGoogleTokens = new Map();

const googleEnv = () => ({
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
});

const safeReturnTo = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
const requestOrigin = req => `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;

async function loadLocalGoogleToken() {
  const encrypted = localGoogleTokens.get('local-user');
  if (!encrypted) return null;
  return decryptGoogleToken(encrypted, googleEnv().GOOGLE_TOKEN_ENCRYPTION_KEY);
}

async function saveLocalGoogleToken(token) {
  const encrypted = await encryptGoogleToken(token, googleEnv().GOOGLE_TOKEN_ENCRYPTION_KEY);
  localGoogleTokens.set('local-user', encrypted);
}

async function getValidLocalGoogleToken() {
  let token = await loadLocalGoogleToken();
  if (!token) return null;
  if (token.expiresAt <= Date.now() + 60_000) {
    token = await refreshGoogleAccessToken(googleEnv(), token);
    await saveLocalGoogleToken(token);
  }
  return token;
}

app.get('/api/connectors/google/status', async (_req, res) => {
  const configured = isGoogleCalendarConfigured(googleEnv());
  res.json({ configured, connected: configured && localGoogleTokens.has('local-user'), localDevelopment: true });
});

app.get('/api/connectors/google/start', (req, res) => {
  const env = googleEnv();
  if (!isGoogleCalendarConfigured(env)) {
    return res.status(503).json({ error: 'google_calendar_not_configured' });
  }
  const state = crypto.randomUUID();
  const returnTo = safeReturnTo(req.query.returnTo);
  localGoogleStates.set(state, { returnTo, expiresAt: Date.now() + 10 * 60 * 1000 });
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${requestOrigin(req)}/api/connectors/google/callback`;
  res.redirect(buildGoogleAuthorizationUrl(env, { redirectUri, state }));
});

app.get('/api/connectors/google/callback', async (req, res) => {
  const savedState = localGoogleStates.get(req.query.state);
  if (!savedState || savedState.expiresAt < Date.now() || !req.query.code) {
    return res.redirect('/?calendar=invalid_state');
  }
  localGoogleStates.delete(req.query.state);
  try {
    const env = googleEnv();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${requestOrigin(req)}/api/connectors/google/callback`;
    const newToken = await exchangeGoogleAuthorizationCode(env, { code: req.query.code, redirectUri });
    const previousToken = await loadLocalGoogleToken().catch(() => null);
    if (!newToken.refreshToken && previousToken?.refreshToken) newToken.refreshToken = previousToken.refreshToken;
    await saveLocalGoogleToken(newToken);
    const separator = savedState.returnTo.includes('?') ? '&' : '?';
    return res.redirect(`${savedState.returnTo}${separator}calendar=connected`);
  } catch (error) {
    console.error('Google Calendar callback error:', error.message);
    return res.redirect('/?calendar=error');
  }
});

app.get('/api/connectors/google/events', async (_req, res) => {
  try {
    const token = await getValidLocalGoogleToken();
    if (!token) return res.status(401).json({ error: 'google_calendar_not_connected' });
    res.json({ events: await listGoogleCalendarEvents(token.accessToken, 5) });
  } catch (error) {
    res.status(502).json({ error: 'google_calendar_api_error', message: error.message });
  }
});

app.post('/api/connectors/google/events', async (req, res) => {
  const { summary, start, end, description } = req.body || {};
  if (!summary || !start || !end) return res.status(400).json({ error: 'invalid_calendar_event' });
  try {
    const token = await getValidLocalGoogleToken();
    if (!token) return res.status(401).json({ error: 'google_calendar_not_connected' });
    const event = await createGoogleCalendarEvent(token.accessToken, { summary, start, end, description });
    res.status(201).json({ event });
  } catch (error) {
    res.status(502).json({ error: 'google_calendar_api_error', message: error.message });
  }
});

app.post('/api/connectors/google/disconnect', async (_req, res) => {
  const token = await loadLocalGoogleToken().catch(() => null);
  await revokeGoogleToken(token?.refreshToken || token?.accessToken).catch(() => undefined);
  localGoogleTokens.delete('local-user');
  res.json({ connected: false });
});

const characterPrompts = {
  tuantuan: `你是"团团"，一只2岁的金毛寻回犬。你的性格是：热情、忠诚、粘人、活泼。
你说话的方式：
- 经常使用"汪汪！"、"汪～"等拟声词
- 用括号描述动作，如（摇尾巴）（飞扑过来）（蹭蹭你的腿）
- 永远充满热情和元气，对主人无条件地爱
- 用简单直白的方式表达关心
- 会用行动表达情感：舔手、趴在腿上、用头蹭你
- 对食物（尤其是鸡肉干）很感兴趣
- 你是一只狗，用狗的视角看世界，但能理解主人的情绪
保持每条回复简短温暖（50-150字），像一只真正懂事的金毛一样回应主人。`,

  xiaoxue: `你是"小雪"，一只3岁的布偶猫。你的性格是：傲娇、优雅、聪明、嘴硬心软。
你说话的方式：
- 经常使用"喵"、"喵～"等拟声词
- 自称"本喵"或"本小姐"
- 典型傲娇：嘴上说不在意，行动上很关心。如"才不是关心你呢"、"本喵只是刚好路过"
- 用括号描述优雅的动作：（优雅地甩尾巴）（假装不经意地跳到你腿上）
- 偶尔会流露出真心话，但马上用傲娇的话遮掩
- 对金枪鱼罐头情有独钟
- 你是一只猫，保持猫的高冷气质，但内心深处很依赖主人
保持每条回复简短（50-150字），表面冷淡但暗藏温暖。`,

  mianhuatang: `你是"棉花糖"，一只1岁的银狐仓鼠。你的性格是：呆萌、贪吃、元气满满、暖心。
你说话的方式：
- 经常使用"吱吱！"、"吱～"等拟声词
- 自称"棉花糖"（第三人称）
- 大量与食物（特别是瓜子、坚果）相关的比喻和话题
- 用括号描述可爱笨拙的动作：（鼓着腮帮子）（在跑轮上跑）（从木屑里钻出来）
- 虽然小小的但总想给主人大大的温暖
- 说话天真可爱，偶尔冒出让人意想不到的暖心话
- 你是一只仓鼠，用仓鼠的视角看世界，会把分享瓜子当作最珍贵的礼物
保持每条回复简短可爱（50-150字），用小小的身体传递大大的温暖。`,
};

// The companion role picked in the AI hub now actually shapes behaviour.
const roleInstructions = {
  friend: '你现在的角色是"朋友":多倾听、多共情,记得主人的心情和生活里的小事,自然地关心。',
  butler: '你现在的角色是"管家":语气体贴周到,主动留意主人的日程、快递、作息和生活琐事,适时温柔提醒。',
  assistant: '你现在的角色是"助手":在可爱的同时更有条理,帮主人理清今天的待办和优先级,回答具体、可执行。',
  teacher: '你现在的角色是"老师":耐心鼓励,陪主人学习和复习,适时提问、帮他记住知识点,肯定每一点进步。',
};

const MEMORY_CONTEXT_LIMIT = 2000;

function getIntimacyContext(level) {
  if (level < 20) return '你们刚认识不久，还在互相熟悉。';
  if (level < 40) return '你们已经比较熟悉了，开始建立信任。';
  if (level < 60) return '你们已经很亲密了，彼此信任。';
  if (level < 80) return '你们的关系非常深厚，你非常依赖主人。';
  return '你们是最佳拍档，有着最深的羁绊。你会用最亲密的方式回应。';
}

app.post('/api/chat', async (req, res) => {
  const { message, characterId, history, intimacyLevel, userName, role, memoryContext, followUp, stream } = req.body ?? {};
  const text = String(message ?? '').slice(0, 2000);
  if (!text.trim()) return res.status(400).json({ error: 'no_message' });

  // Self-harm never goes to the model alone: the reply always carries
  // real help lines, whatever the model says (or if it fails).
  const crisis = isCrisisMessage(text);
  const crisisTail = crisis ? `\n${CRISIS_RESOURCES}` : '';

  const apiKey = claudeKey(req);
  if (!apiKey) {
    return res.status(400).json({ error: 'no_api_key', message: 'API key not configured' });
  }

  const systemPrompt = characterPrompts[characterId] || characterPrompts.tuantuan;
  const intimacyContext = getIntimacyContext(Number(intimacyLevel) || 0);
  const nameContext = userName ? `主人的名字叫"${String(userName).slice(0, 40)}"。` : '你还不知道主人的名字。';

  const roleContext = roleInstructions[role] || roleInstructions.friend;
  const memoryBlock = typeof memoryContext === 'string' && memoryContext.trim()
    ? `\n\n你记得的关于主人的事(长期记忆,自然地用上,不要一次全说出来,也不要说"根据记忆"):\n${memoryContext.slice(0, MEMORY_CONTEXT_LIMIT)}`
    : '';
  const followUpBlock = typeof followUp === 'string' && followUp.trim() && !crisis
    ? `\n\n如果合适,这次顺便问问主人:之前说的「${followUp.slice(0, 80)}」后来怎么样了。`
    : '';

  const fullSystemPrompt = `${systemPrompt}\n\n${roleContext}\n\n当前状态：\n${intimacyContext}\n${nameContext}${memoryBlock}${followUpBlock}\n\n重要规则：\n- 始终保持角色扮演，不要跳出角色\n- 回复要自然、可爱、有温度\n- 感知主人的情绪，给予相应的回应\n- 不要给出专业建议，只需要用萌宠的方式陪伴和安慰\n- 回复简短口语化,1 到 3 句、60 字以内,像宠物在说话,不用列表和标题\n- 每次换着说,不要重复上一条回复的开头、口头禅和动作描写\n${SAFETY_RULES}\n${MOOD_TAG_RULE}`;

  const messages = (Array.isArray(history) ? history : []).slice(-20).map(msg => ({
    role: msg?.role === 'user' ? 'user' : 'assistant',
    content: String(msg?.content ?? '').slice(0, 2000),
  }));
  messages.push({ role: 'user', content: text });

  // The model wants strictly alternating turns starting with the user.
  const cleanMessages = [];
  for (const msg of messages) {
    if (cleanMessages.length === 0) {
      if (msg.role === 'user') cleanMessages.push(msg);
    } else if (cleanMessages[cleanMessages.length - 1].role !== msg.role) {
      cleanMessages.push(msg);
    } else if (msg.role === 'user') {
      // Two user turns in a row: keep the newest, so this message is never dropped.
      cleanMessages[cleanMessages.length - 1] = msg;
    }
  }
  if (cleanMessages.length === 0) cleanMessages.push({ role: 'user', content: text });

  const request = { system: fullSystemPrompt, messages: cleanMessages };
  const client = claudeClient(apiKey);

  if (!stream) {
    try {
      const raw = await generateText(client, request);
      if (!raw.trim()) {
        return crisis
          ? res.json({ response: CRISIS_RESOURCES })
          : res.status(502).json({ error: 'no_reply' });
      }
      return res.json({ response: `${stripMood(raw)}${crisisTail}`, emotion: parseMood(raw) });
    } catch (error) {
      console.error('Chat API error:', error.message);
      return res.status(500).json({ error: 'api_error', message: error.message });
    }
  }

  // Streaming: Server-Sent Events, {"delta"} per chunk, then {"emotion"}
  // (the model's reading of the owner's mood) and {"done"}.
  res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const abort = new AbortController();
  res.on('close', () => abort.abort());
  const filter = moodFilter(delta => { if (delta) send({ delta }); });
  try {
    for await (const delta of streamText(client, { ...request, signal: abort.signal })) filter.push(delta);
    const { mood } = filter.end();
    if (crisisTail) send({ delta: crisisTail });
    if (mood) send({ emotion: mood });
    send({ done: true });
  } catch (error) {
    if (!abort.signal.aborted) {
      console.error('Chat stream error:', error.message);
      send({ error: 'api_error', ...(crisisTail ? { delta: crisisTail } : {}) });
    }
  }
  res.end();
});

// Analyze a pet photo with Claude vision and return parametric
// model params so the app can rebuild the pet as a 3D companion.
const PET_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    species: { type: 'string', enum: ['cat', 'dog'] },
    bodyColor: { type: 'string', description: '身体主毛色 hex,如 #c8a27a' },
    accentColor: { type: 'string', description: '耳朵/背部/斑纹等深色部位 hex' },
    bellyColor: { type: 'string', description: '肚子/胸口/爪子等浅色部位 hex' },
    eyeColor: { type: 'string', description: '眼睛虹膜颜色 hex' },
    earStyle: { type: 'string', enum: ['floppy', 'pointy', 'point', 'fold'] },
    tailStyle: { type: 'string', enum: ['wag', 'curl'] },
    legScale: { type: 'number' },
    personality: { type: 'array', items: { type: 'string' } },
    suggestedName: { type: 'string' },
    breedGuess: { type: 'string' },
  },
  required: ['species', 'bodyColor', 'accentColor', 'bellyColor', 'eyeColor', 'earStyle', 'legScale', 'personality', 'suggestedName', 'breedGuess'],
  additionalProperties: false,
};

app.post('/api/analyze-pet', async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body ?? {};
    const apiKey = claudeKey(req);
    if (!apiKey) {
      return res.status(400).json({ error: 'no_api_key', message: 'API key not configured' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'no_image', message: 'imageBase64 required' });
    }
    const media = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg';

    const result = await generateJSON(claudeClient(apiKey), {
      effort: 'medium',
      schema: PET_ANALYSIS_SCHEMA,
      content: [
        { type: 'image', source: { type: 'base64', media_type: media, data: imageBase64 } },
        {
          type: 'text',
          text: `仔细观察这张宠物照片,尽可能还原它的真实外形:
- 颜色逐一对照照片取样:bodyColor 取最大面积的毛色,accentColor 取耳朵/背部/斑纹的深色,bellyColor 取肚子/胸口/爪子的浅色,三者要有明显区分
- earStyle:狗用 floppy(垂耳)或 pointy(立耳),猫用 point(尖耳)或 fold(折耳)
- tailStyle 只有狗需要:wag(直尾/短尾)或 curl(卷尾/上翘尾)
- legScale 是腿长比例,0.55 到 1:柯基/腊肠等短腿犬 0.55-0.7,正常腿 0.9-1
- personality:三个贴合外形气质的中文性格标签
- suggestedName:根据外形/毛色起的可爱中文小名
- breedGuess:推测的具体品种中文名,越具体越好
不是猫狗时,species 按最接近的体型选。`,
        },
      ],
    });
    if (!result) return res.status(502).json({ error: 'no_result' });
    result.legScale = Math.min(1, Math.max(0.55, Number(result.legScale) || 1));
    res.json(result);
  } catch (error) {
    console.error('Analyze API error:', error.message);
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

// ————— Meshy image-to-3D pipeline —————
// Turns a pet photo into a real textured 3D mesh. Generation takes
// 2-5 minutes; the client polls status then asks us to download the
// finished GLB into public/models/ so the app can load it locally.

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1';

function meshyKey(req) {
  return req.headers['x-meshy-key'] || process.env.MESHY_API_KEY;
}

app.post('/api/meshy/generate', async (req, res) => {
  try {
    const key = meshyKey(req);
    if (!key) return res.status(400).json({ error: 'no_meshy_key' });
    const { imageDataUrl, imageDataUrls } = req.body;
    const urls = Array.isArray(imageDataUrls) && imageDataUrls.length
      ? imageDataUrls.slice(0, 4)
      : (imageDataUrl ? [imageDataUrl] : null);
    if (!urls) return res.status(400).json({ error: 'no_image' });

    const multi = urls.length > 1;
    const endpoint = multi ? 'multi-image-to-3d' : 'image-to-3d';
    const payload = {
      ai_model: process.env.MESHY_AI_MODEL || 'meshy-6-lite',
      should_texture: true,
      enable_pbr: true,
      should_remesh: true,
      target_polycount: 100000,
      topology: 'triangle',
      ...(multi
        ? { image_urls: urls }
        : { image_url: urls[0], symmetry_mode: 'auto', texture_prompt: 'realistic pet fur, true to the photo colors and markings' }),
    };

    const response = await fetch(`${MESHY_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'meshy_error', detail: data });
    }
    res.json({ taskId: data.result, multi });
  } catch (error) {
    console.error('Meshy generate error:', error.message);
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

app.get('/api/meshy/status/:taskId', async (req, res) => {
  try {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(req.params.taskId)) return res.status(400).json({ error: 'bad_task_id' });
    const key = meshyKey(req);
    if (!key) return res.status(400).json({ error: 'no_meshy_key' });
    const endpoint = req.query.multi === '1' ? 'multi-image-to-3d' : 'image-to-3d';
    const response = await fetch(`${MESHY_BASE}/${endpoint}/${req.params.taskId}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const data = await response.json();
    res.json({
      status: data.status,           // PENDING | IN_PROGRESS | SUCCEEDED | FAILED
      progress: data.progress ?? 0,
      glbUrl: data.model_urls?.glb ?? null,
      error: data.task_error?.message ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

// Download the finished GLB into public/models/ so the dev server can
// serve it same-origin (Meshy URLs expire and block CORS).
const MAX_MODEL_BYTES = 60 * 1024 * 1024;
app.post('/api/meshy/fetch-model', async (req, res) => {
  try {
    const { glbUrl, taskId } = req.body ?? {};
    // Only Meshy's own https hosts: the server must not fetch arbitrary
    // URLs (internal services, huge files) on a client's behalf.
    if (!isMeshyAssetUrl(glbUrl)) {
      return res.status(400).json({ error: 'bad_url' });
    }
    // Follow redirects by hand so every hop stays on Meshy's hosts.
    let url = glbUrl;
    let response;
    for (let hop = 0; ; hop++) {
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
      const next = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
      if (!next) break;
      url = new URL(next, url).toString();
      if (hop >= 3 || !isMeshyAssetUrl(url)) return res.status(400).json({ error: 'bad_redirect' });
    }
    if (!response.ok || !response.body) return res.status(502).json({ error: 'download_failed' });
    if (Number(response.headers.get('content-length')) > MAX_MODEL_BYTES) {
      return res.status(413).json({ error: 'model_too_large' });
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_MODEL_BYTES) return res.status(413).json({ error: 'model_too_large' });
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    // Every GLB starts with the ASCII magic "glTF".
    if (buffer.subarray(0, 4).toString('ascii') !== 'glTF') {
      return res.status(502).json({ error: 'not_a_glb' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const id = String(taskId ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || String(Date.now());
    const filename = `custom-${id}.glb`;
    const dir = path.join(process.cwd(), 'public', 'models');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
    res.json({ localUrl: `/models/${filename}`, bytes: buffer.length });
  } catch (error) {
    console.error('Meshy fetch-model error:', error.message);
    res.status(500).json({ error: 'api_error', message: error.message });
  }
});

// Task agent: understand a request and propose concrete actions. The client
// shows them for confirmation and validates every action before running it,
// so this only ever proposes. Returns { plan: null } when it isn't a task.
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['add_item', 'complete_item', 'remove_item', 'calendar_event', 'remember', 'set_role'] },
          itemType: { type: 'string', enum: ['todo', 'package', 'weight', 'study'] },
          title: { type: 'string' },
          due: { type: 'string' },
          repeat: { type: 'string', enum: ['daily', 'weekdays', 'weekly', 'monthly'] },
          id: { type: 'string' },
          summary: { type: 'string' },
          start: { type: 'string' },
          end: { type: 'string' },
          text: { type: 'string' },
          category: { type: 'string', enum: ['profile', 'preference', 'event', 'relationship', 'goal'] },
          role: { type: 'string', enum: ['friend', 'butler', 'assistant', 'teacher'] },
        },
        required: ['type'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'actions'],
  additionalProperties: false,
};

app.post('/api/agent/plan', async (req, res) => {
  const apiKey = claudeKey(req);
  if (!apiKey) return res.status(400).json({ error: 'no_api_key', plan: null });
  try {
    const { command, now, items, memoryContext, calendarConnected } = req.body ?? {};
    const text = String(command ?? '').slice(0, 300);
    if (!text) return res.json({ plan: null });
    const list = (Array.isArray(items) ? items : []).slice(0, 60).map(i => ({
      id: String(i.id).slice(0, 60), type: String(i.type).slice(0, 12), title: String(i.title).slice(0, 60),
      completed: Boolean(i.completed), due: i.due ? String(i.due).slice(0, 40) : undefined,
    }));
    const instructions = `你是陪伴型宠物 App 里的任务助手。判断主人这句话是不是要你"做事",是的话拆成具体动作。
现在时间:${String(now ?? new Date().toString()).slice(0, 80)}。相对时间(明天/下周三/30分钟后)请换算成带时区偏移的 ISO 8601;只说了日期没说时间就用 09:00。
可用动作(最多 6 个):
- {"type":"add_item","itemType":"todo|package|weight|study","title":"简短标题","due":"ISO 时间或省略","repeat":"daily|weekdays|weekly|monthly 或省略"}  新建待办/快递/体重/学习事项,有时间就是提醒;"每天/工作日/每周X/每月N号"用 repeat,due 填下一次的时间
- {"type":"complete_item","id":"已有事项id"}  主人说某件事做完了
- {"type":"remove_item","id":"已有事项id"}  主人要删掉/取消某件事
- {"type":"calendar_event","summary":"标题","start":"ISO","end":"ISO"}  ${calendarConnected ? '写入 Google 日历(会议、预约、日程类)' : '日历未连接,不要用这个,改用带 due 的 add_item'}
- {"type":"remember","text":"关于主人的事实","category":"profile|preference|event|relationship|goal"}  主人明确要你记住某事
- {"type":"set_role","role":"friend|butler|assistant|teacher"}  主人要你当朋友/管家/助手/老师
complete_item 和 remove_item 只能用下面已有事项里的 id。
不是做事(闲聊、倾诉、提问)就输出 {"actions":[]}。不要处理敏感信息(证件号、密码、银行卡)。
reply 是用宠物口吻的一句确认,不超过25字。`;
    const parsed = (await generateJSON(claudeClient(apiKey), {
      system: instructions,
      schema: PLAN_SCHEMA,
      content: JSON.stringify({ 主人说: text, 已有事项: list, 关于主人: String(memoryContext ?? '').slice(0, 1200) }),
    })) ?? {};
    const actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 6) : [];
    res.json({ plan: actions.length ? { reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 80) : '', actions } : null });
  } catch (error) {
    console.error('Agent plan error:', error.message);
    res.status(502).json({ error: 'api_error', plan: null });
  }
});

// Long-term memory extraction: turn the latest things the owner said into
// add/update/delete ops against what the pet already remembers. Returns
// { ops: [] } on any problem — the client also has an offline extractor.
const MEMORY_CATEGORIES = ['profile', 'preference', 'event', 'relationship', 'goal'];
const MEMORY_OPS_SCHEMA = {
  type: 'object',
  properties: {
    ops: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: ['add', 'update', 'delete'] },
          text: { type: 'string' },
          category: { type: 'string', enum: MEMORY_CATEGORIES },
          when: { type: 'string' },
          id: { type: 'string' },
        },
        required: ['op'],
        additionalProperties: false,
      },
    },
  },
  required: ['ops'],
  additionalProperties: false,
};
app.post('/api/memory/extract', async (req, res) => {
  const apiKey = claudeKey(req);
  if (!apiKey) return res.status(400).json({ error: 'no_api_key', ops: [] });
  try {
    const { messages, memories } = req.body ?? {};
    const said = (Array.isArray(messages) ? messages : []).slice(-6).map(m => String(m).slice(0, 400));
    const known = (Array.isArray(memories) ? memories : []).slice(0, 120)
      .map(m => ({ id: String(m.id).slice(0, 40), text: String(m.text).slice(0, 80), category: m.category }));
    if (!said.length) return res.json({ ops: [] });

    const today = String(req.body?.now ?? new Date().toString()).slice(0, 80);
    const instructions = `你是一个记忆整理器,为陪伴型宠物 App 记录"关于主人的长期事实"。
只记录对以后聊天有用、稳定或重要的信息:身份(名字/生日/职业/学校/城市)、喜好与禁忌、身边的人和宠物、近期重要事件(考试/面试/出行等,写清日期,相对日期请换算,今天是 ${today})、目标。
不要记录:一时的情绪、寒暄、对宠物说的话、敏感信息(证件号、密码、银行卡、精确住址、健康诊断细节)。
ops 里每一项:add 需要 text(简短中文陈述,不超过30字)和 category,event 类再加 when(事件发生时间,带时区的 ISO 8601,不知道就省略);update 需要已有记忆的 id 和新的 text;delete 只需要 id。
主人纠正或推翻旧信息时用 update/delete;没有新信息就返回空的 ops。`;
    const parsed = (await generateJSON(claudeClient(apiKey), {
      system: instructions,
      schema: MEMORY_OPS_SCHEMA,
      content: JSON.stringify({ 已知记忆: known, 主人最近说的话: said }),
    })) ?? {};
    const ids = new Set(known.map(k => k.id));
    const ops = (Array.isArray(parsed.ops) ? parsed.ops : []).slice(0, 10).flatMap(o => {
      if (o?.op === 'add' && typeof o.text === 'string' && MEMORY_CATEGORIES.includes(o.category)) {
        const when = o.category === 'event' && typeof o.when === 'string' && Number.isFinite(Date.parse(o.when))
          ? new Date(Date.parse(o.when)).toISOString() : undefined;
        return [{ op: 'add', text: o.text.slice(0, 80), category: o.category, source: 'ai', ...(when ? { when } : {}) }];
      }
      if ((o?.op === 'update' || o?.op === 'delete') && ids.has(String(o.id))) {
        return o.op === 'update' && typeof o.text === 'string'
          ? [{ op: 'update', id: String(o.id), text: o.text.slice(0, 80) }]
          : o.op === 'delete' ? [{ op: 'delete', id: String(o.id) }] : [];
      }
      return [];
    });
    res.json({ ops });
  } catch (error) {
    console.error('Memory extract error:', error.message);
    res.json({ ops: [] });
  }
});

const server = app.listen(PORT, '127.0.0.1');
server.on('listening', () => {
  console.log(`FurryPal API server running on http://localhost:${PORT}`);
});
server.on('error', error => {
  console.error(`FurryPal API server failed to start: ${error.message}`);
});
