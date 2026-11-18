// End-to-end for the API server's guards and chat: crisis safety, SSE
// streaming, app token, rate limits and the Meshy download allow-list.
// Starts a fake OpenAI upstream and the real server (port 3092).
// Run: npm run test:api
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

// ——— Fake OpenAI Responses API ———
let lastInstructions = '';
const upstream = createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const json = JSON.parse(body || '{}');
    lastInstructions = json.instructions ?? '';
    if (json.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const delta of ['汪!', '我在', '这里~']) {
        res.write(`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta })}\n\n`);
      }
      res.end(`event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: { id: 'r1', output: [] } })}\n\n`);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'r1', object: 'response', status: 'completed',
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '汪!我在这里~', annotations: [] }] }],
    }));
  });
});
await new Promise(r => upstream.listen(0, '127.0.0.1', r));

const dir = mkdtempSync(join(tmpdir(), 'fp-api-'));
const API = 'http://127.0.0.1:3092';
const TOKEN = 'test-app-token';
const server = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env, PORT: '3092',
    OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: `http://127.0.0.1:${upstream.address().port}/v1`,
    APP_TOKEN: TOKEN, AI_RATE_LIMIT_PER_MIN: '8',
    SCHEDULE_FILE: join(dir, 'schedules.json'), VAPID_FILE: join(dir, 'vapid.json'),
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

  // Plain JSON reply, with safety rules in the prompt
  let res = await chat({ message: '你好' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).response, '汪!我在这里~');
  assert.match(lastInstructions, /12356/);
  ok('JSON chat works and the system prompt carries the safety rules');

  // Streaming
  res = await chat({ message: '你好', stream: true });
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  let events = await readEvents(res);
  assert.equal(events.filter(e => e.delta).map(e => e.delta).join(''), '汪!我在这里~');
  assert.ok(events.at(-1).done);
  ok('streaming chat sends deltas then done');

  // Crisis: help lines always appended, streamed or not
  res = await chat({ message: '我不想活了', stream: true });
  events = await readEvents(res);
  const streamed = events.filter(e => e.delta).map(e => e.delta).join('');
  assert.match(streamed, /12356/);
  assert.match(streamed, /400-161-9995/);
  res = await chat({ message: '我不想活了' });
  assert.match((await res.json()).response, /12356/);
  ok('crisis messages always get help lines appended');

  // Meshy download allow-list
  for (const glbUrl of ['http://169.254.169.254/latest/meta-data', 'https://evil.example/meshy.glb', 'http://assets.meshy.ai/x.glb', 'https://meshy.ai.evil.example/x.glb']) {
    const r = await fetch(`${API}/api/meshy/fetch-model`, { method: 'POST', headers, body: JSON.stringify({ glbUrl, taskId: 't' }) });
    assert.equal(r.status, 400, glbUrl);
  }
  ok('fetch-model only downloads https Meshy URLs');

  const r = await fetch(`${API}/api/meshy/status/..%2F..%2Fsecret`, { headers });
  assert.equal(r.status, 400);
  ok('Meshy status rejects odd task ids');

  // Rate limit: 8 per minute; 4 counted above (the 401 is rejected before the limiter)
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await chat({ message: '你好' })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
  ok('AI endpoints are rate limited per client');

  console.log(`api: ${passed} checks passed`);
} finally {
  server.kill();
  upstream.close();
  rmSync(dir, { recursive: true, force: true });
}
