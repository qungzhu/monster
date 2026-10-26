// End-to-end: sync a reminder, let the server's ticker fire it through
// web-push to a fake push service, and decrypt what arrives (RFC 8291).
// Run: npm run test:push   (starts its own API server on port 3091)
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createECDH, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { createServer } from 'node:https';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const b64u = buf => Buffer.from(buf).toString('base64url');
const dir = mkdtempSync(join(tmpdir(), 'fp-push-'));
const API = 'http://127.0.0.1:3091';
const KEY = 'test-device-key-0123456789';
let passed = 0;
const ok = name => { passed++; console.log(`  ✓ ${name}`); };

// Browser side of a push subscription.
const ua = createECDH('prime256v1');
ua.generateKeys();
const auth = randomBytes(16);

function decrypt(body) {
  const salt = body.subarray(0, 16);
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertext = body.subarray(21 + idlen);
  const secret = ua.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', secret, auth, keyInfo, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(ciphertext.subarray(-16));
  const plain = Buffer.concat([d.update(ciphertext.subarray(0, -16)), d.final()]);
  return JSON.parse(plain.subarray(0, plain.lastIndexOf(2)).toString());
}

// Fake push service. web-push only speaks HTTPS, so it gets a throwaway
// self-signed certificate that only the spawned API server trusts.
execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
  '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'), '-days', '1',
  '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
const received = [];
const push = createServer({ key: readFileSync(join(dir, 'key.pem')), cert: readFileSync(join(dir, 'cert.pem')) }, (req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    received.push({ path: req.url, headers: req.headers, job: decrypt(Buffer.concat(chunks)) });
    res.writeHead(req.url.includes('gone') ? 410 : 201).end();
  });
});
await new Promise(r => push.listen(4991, '127.0.0.1', r));

const server = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env, PORT: '3091', PUSH_ALLOW_ANY_ENDPOINT: '1', SCHEDULE_TICK_MS: '500',
    SCHEDULE_FILE: join(dir, 'schedules.json'), VAPID_FILE: join(dir, 'vapid.json'),
    VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', NODE_EXTRA_CA_CERTS: join(dir, 'cert.pem'),
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const until = async (cond, ms = 8000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timeout'); await new Promise(r => setTimeout(r, 100)); } };

try {
  for (let i = 0; ; i++) { try { await fetch(`${API}/api/schedule/vapid`); break; } catch { if (i > 50) throw new Error('server did not start'); await new Promise(r => setTimeout(r, 200)); } }
  const { publicKey } = await (await fetch(`${API}/api/schedule/vapid`)).json();
  assert.equal(Buffer.from(publicKey, 'base64url').length, 65);
  ok('VAPID key generated and served');

  const subscription = { endpoint: 'https://127.0.0.1:4991/push/dev1', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) } };
  const now = Date.now();
  let r = await post('/api/schedule/sync', { key: KEY, tz: 'Asia/Shanghai', subscription, jobs: [
    { id: 'r:milk', kind: 'reminder', at: now + 1000, title: '⏰ 斑斑提醒你', body: '买牛奶' },
    { id: 'morning', kind: 'morning', at: now + 1200, repeat: 'daily', title: '☀️ 斑斑', body: '早安!' },
    { id: 'r:later', kind: 'reminder', at: now + 3_600_000, title: 't', body: '一小时后' },
  ] });
  assert.deepEqual(await r.json(), { ok: true, jobs: 3, push: true });
  ok('sync accepted 3 jobs with a subscription');

  await until(() => received.length >= 2);
  await new Promise(r => setTimeout(r, 1200)); // nothing else should arrive
  assert.deepEqual(received.map(x => x.job.body).sort(), ['买牛奶', '早安!']);
  const h = received[0].headers;
  assert.match(h.authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  assert.equal(h['content-encoding'], 'aes128gcm');
  assert.equal(h.ttl, '3600');
  ok('due reminders delivered once, encrypted + VAPID-signed, decrypted correctly');

  const saved = JSON.parse(readFileSync(join(dir, 'schedules.json'), 'utf8')).devices[KEY];
  assert.deepEqual(saved.jobs.map(j => j.id).sort(), ['morning', 'r:later']);
  assert.ok(saved.jobs.find(j => j.id === 'morning').at > now + 23 * 3_600_000);
  ok('persisted: one-off removed, daily moved to tomorrow');

  r = await post('/api/schedule/test', { key: KEY, body: '测试一下' });
  assert.equal(r.status, 200);
  await until(() => received.length >= 3);
  assert.equal(received[2].job.body, '测试一下');
  assert.equal((await post('/api/schedule/test', { key: KEY })).status, 429);
  ok('test notification works and is rate-limited');

  assert.equal((await post('/api/schedule/sync', { key: 'bad', jobs: [] })).status, 400);
  r = await post('/api/schedule/sync', { key: 'other-device-key-01234567', subscription: { ...subscription, endpoint: 'https://evil.example/x' }, jobs: [] });
  assert.equal((await r.json()).push, true, 'test mode allows any endpoint'); // production rejects (unit-tested)
  ok('bad keys rejected');

  // A push service answering 410 Gone drops the subscription.
  await post('/api/schedule/sync', { key: 'gone-device-key-0123456789', subscription: { ...subscription, endpoint: 'https://127.0.0.1:4991/push/gone' }, jobs: [
    { id: 'r:x', kind: 'reminder', at: Date.now() + 300, title: 't', body: 'x' },
    { id: 'r:y', kind: 'reminder', at: Date.now() + 1500, title: 't', body: 'y' },
  ] });
  await until(() => received.some(x => x.path.includes('gone')));
  await new Promise(r => setTimeout(r, 2200));
  assert.equal(received.filter(x => x.path.includes('gone')).length, 1);
  ok('410 Gone drops the subscription (no more sends)');

  await post('/api/schedule/forget', { key: KEY });
  await new Promise(r => setTimeout(r, 800));
  assert.equal(JSON.parse(readFileSync(join(dir, 'schedules.json'), 'utf8')).devices[KEY], undefined);
  ok('forget deletes the device');
  console.log(`push: ${passed} checks passed`);
} finally {
  server.kill();
  push.close();
  rmSync(dir, { recursive: true, force: true });
}
