// End-to-end for the API server's guards and chat: crisis safety, SSE
// streaming, app token, rate limits and the Meshy download allow-list.
// Starts a fake Claude upstream and the real server (port 3092).
// Run: npm run test:api
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CRISIS_PATTERNS as SERVER_PATTERNS, isCrisisMessage } from '../safety.js';

let passed = 0;
const ok = name => { passed++; console.log(`  ✓ ${name}`); };

// ——— Crisis detection (pure) ———
for (const t of ['我真的不想活了', '好想死', '活着没意思', '我想自杀', 'I want to die', 'thinking about killing myself']) {
  assert.ok(isCrisisMessage(t), `should flag: ${t}`);
}
for (const t of ['想死你了!', '想死我了', '笑死我了', '今天累死了', '饿死啦', '你好呀']) {
  assert.ok(!isCrisisMessage(t), `should not flag: ${t}`);
}
ok('crisis patterns: catch self-harm, ignore "想死你了 / 笑死 / 累死"');

// The client copy must match the server copy.
const clientSrc = readFileSync(new URL('../../src/utils/safety.ts', import.meta.url), 'utf8');
const clientBlock = clientSrc.slice(clientSrc.indexOf('CRISIS_PATTERNS'), clientSrc.indexOf('];'));
const clientPatterns = [...clientBlock.matchAll(/^\s*(\/.+\/[a-z]*),\s*$/gm)].map(m => m[1]);
assert.deepEqual(clientPatterns, SERVER_PATTERNS.map(String));
ok('client and server crisis patterns are in sync');

// ——— Fake Claude Messages API ———
let lastRequest = {};
let refuseNext = false;
const message = (content, stop_reason = 'end_turn') => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason,
  stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
});
const upstream = createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const json = JSON.parse(body || '{}');
    lastRequest = { ...json, beta: req.headers['anthropic-beta'] };
    const system = JSON.stringify(json.system ?? '');
    if (refuseNext) {
      refuseNext = false;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(message([], 'refusal')));
    }
    if (json.output_config?.format?.type === 'json_schema') {
      const out = system.includes('记忆整理器')
        ? { ops: [{ op: 'add', text: '主人下周三面试', category: 'event' }] }
        : { reply: '好的', actions: [] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(message([{ type: 'text', text: JSON.stringify(out) }])));
    }
    const reply = ['汪!', '我在', '这里~\n<mo', 'od>sad,anxious</mood>'];
    if (json.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      ev('message_start', { message: message([]) });
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      for (const text of reply) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text } });
      ev('content_block_stop', { index: 0 });
      ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 10 } });
      ev('message_stop', {});
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(message([{ type: 'text', text: reply.join('') }])));
  });
});
await new Promise(r => upstream.listen(0, '127.0.0.1', r));

const dir = mkdtempSync(join(tmpdir(), 'fp-api-'));
const API = 'http://127.0.0.1:3092';
const TOKEN = 'test-app-token';
const server = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env, PORT: '3092',
    ANTHROPIC_API_KEY: 'sk-ant-test', ANTHROPIC_BASE_URL: `http://127.0.0.1:${upstream.address().port}`,
    APP_TOKEN: TOKEN, AI_RATE_LIMIT_PER_MIN: '8',
    SCHEDULE_FILE: join(dir, 'schedules.json'), VAPID_FILE: join(dir, 'vapid.json'), SAVES_DIR: join(dir, 'saves'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', d => { serverLog += d; });
server.stderr.on('data', d => { serverLog += d; });

const headers = { 'Content-Type': 'application/json', 'X-App-Token': TOKEN };
const chat = (body, h = headers) => fetch(`${API}/api/chat`, { method: 'POST', headers: h, body: JSON.stringify({ characterId: 'tuantuan', ...body }) });

async function readEvents(res) {
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map(b => JSON.parse(b.replace(/^data: /, '')));
}

try {
  for (let i = 0; ; i++) {
    try { await fetch(`${API}/api/push/vapid`); break; } catch { if (i > 50) throw new Error(`server did not start\n${serverLog}`); }
    await new Promise(r => setTimeout(r, 100));
  }

  // App token
  assert.equal((await chat({ message: '你好' }, { 'Content-Type': 'application/json' })).status, 401);
  ok('paid endpoints need the app token when APP_TOKEN is set');

  // Plain JSON reply: mood tag stripped and returned separately
  let res = await chat({ message: '你好' });
  assert.equal(res.status, 200);
  let body = await res.json();
  assert.equal(body.response, '汪!我在这里~');
  assert.deepEqual(body.emotion, { primary: 'sad', secondary: 'anxious' });
  assert.equal(lastRequest.model, 'claude-opus-5-5');
  assert.equal(lastRequest.fallbacks, 'default');
  assert.match(lastRequest.beta, /server-side-fallback-2026-07-01/);
  assert.match(JSON.stringify(lastRequest.system), /12356/);
  ok('Claude chat: safety rules + refusal fallback sent, mood tag parsed out');

  // Streaming: the tag never reaches the client, even split across chunks
  res = await chat({ message: '你好', stream: true });
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  let events = await readEvents(res);
  const shown = events.filter(e => e.delta).map(e => e.delta).join('');
  assert.equal(shown.trim(), '汪!我在这里~');
  assert.doesNotMatch(shown, /mood|</);
  assert.deepEqual(events.find(e => e.emotion).emotion, { primary: 'sad', secondary: 'anxious' });
  assert.ok(events.at(-1).done);
  ok('streaming chat: deltas, hidden mood tag, emotion event, done');

  // Crisis: help lines always appended, streamed or not
  res = await chat({ message: '我不想活了', stream: true });
  events = await readEvents(res);
  const streamed = events.filter(e => e.delta).map(e => e.delta).join('');
  assert.match(streamed, /12356/);
  assert.match(streamed, /400-161-9995/);
  res = await chat({ message: '我不想活了' });
  assert.match((await res.json()).response, /12356/);
  ok('crisis messages always get help lines appended');

  // Refusal: no empty reply; the client falls back to its template
  refuseNext = true;
  res = await chat({ message: '你好' });
  assert.equal(res.status, 502);
  ok('a refused chat returns an error the client can fall back from');

  // Structured outputs for memory extraction
  res = await fetch(`${API}/api/memory/extract`, { method: 'POST', headers, body: JSON.stringify({ messages: ['我下周三面试'], memories: [] }) });
  body = await res.json();
  assert.equal(lastRequest.output_config.format.type, 'json_schema');
  assert.deepEqual(body.ops.map(o => o.text), ['主人下周三面试']);
  ok('memory extraction uses JSON-schema structured output');

  // Cloud save with a sync code
  const save = (method, code, body) => fetch(`${API}/api/save`, {
    method, headers: { ...headers, ...(code ? { 'X-Sync-Code': code } : {}) }, body: body && JSON.stringify(body),
  });
  res = await save('POST', null, { data: { 'fp-user-name': '"小明"' } });
  const { code } = await res.json();
  assert.match(code, /^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  assert.equal(readdirSync(join(dir, 'saves')).some(f => f.includes(code)), false);
  res = await save('GET', code.toLowerCase().replace(/-/g, ' '));
  assert.equal((await res.json()).data['fp-user-name'], '"小明"');
  ok('sync code created, stored hashed, restorable however it is typed');

  res = await save('PUT', code, { data: { 'fp-coins': '10' }, baseVersion: 1 });
  assert.equal((await res.json()).version, 2);
  res = await save('PUT', code, { data: { 'fp-coins': '99' }, baseVersion: 1 });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).data['fp-coins'], '10');
  ok('a stale device gets the newer save back instead of overwriting it');

  assert.equal((await save('GET', 'AAAA-BBBB-CCCC')).status, 404);
  assert.equal((await save('POST', null, { data: { 'evil-key': 'x' } })).status, 400);
  assert.equal((await save('POST', null, { data: { 'fp-x': { nested: 1 } } })).status, 400);
  assert.equal((await save('DELETE', code)).status, 200);
  assert.equal((await save('GET', code)).status, 404);
  ok('unknown codes 404, only fp-* string values accepted, delete works');

  // Meshy download allow-list
  for (const glbUrl of ['http://169.254.169.254/latest/meta-data', 'https://evil.example/meshy.glb', 'http://assets.meshy.ai/x.glb', 'https://meshy.ai.evil.example/x.glb']) {
    const r = await fetch(`${API}/api/meshy/fetch-model`, { method: 'POST', headers, body: JSON.stringify({ glbUrl, taskId: 't' }) });
    assert.equal(r.status, 400, glbUrl);
  }
  ok('fetch-model only downloads https Meshy URLs');

  const r = await fetch(`${API}/api/meshy/status/..%2F..%2Fsecret`, { headers });
  assert.equal(r.status, 400);
  ok('Meshy status rejects odd task ids');

  // Rate limit: 8 per minute; 6 counted above across AI routes (the 401 is rejected before the limiter)
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await chat({ message: '你好' })).status);
  assert.deepEqual(statuses, [200, 200, 429, 429, 429]);
  ok('AI endpoints are rate limited per client');

  console.log(`api: ${passed} checks passed`);
} finally {
  server.kill();
  upstream.close();
  rmSync(dir, { recursive: true, force: true });
}
