// Cloud saves keyed by a sync code — no accounts. The owner gets a code
// like "K7QX-M2PD-9WFT" and types it on a new phone to bring their pet,
// memories and diary along; after that both devices keep syncing.
//
//   POST   /api/save            → { code, version }        create
//   GET    /api/save            → { version, updatedAt, data }
//   PUT    /api/save            { data, baseVersion } → { version }
//                                409 { version, updatedAt, data } when another device saved first
//   DELETE /api/save            → { ok }
// The code travels in the X-Sync-Code header. Only its SHA-256 is stored,
// so the files on disk don't reveal anyone's code.
//
// Env: SAVES_DIR (default server/data/saves).
import { createHash, randomInt } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// No 0/O/1/I/L: easy to read out and type. 12 chars ≈ 60 bits.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

export function newSyncCode() {
  let s = '';
  for (let i = 0; i < 12; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** Normalise what people type: case, spaces, missing dashes. */
export function normalizeSyncCode(raw) {
  const s = String(raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length !== 12 || [...s].some(c => !ALPHABET.includes(c))) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export function mountSaves(app, { dir = process.env.SAVES_DIR || path.join(process.cwd(), 'server', 'data', 'saves') } = {}) {
  mkdirSync(dir, { recursive: true });
  const fileFor = code => path.join(dir, `${createHash('sha256').update(code).digest('hex')}.json`);
  const read = code => {
    try { return JSON.parse(readFileSync(fileFor(code), 'utf8')); } catch { return null; }
  };
  const write = (code, save) => {
    const file = fileFor(code);
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(save));
    renameSync(tmp, file); // atomic: a crash never leaves half a save
  };
  const validData = data => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    return Object.entries(data).every(([k, v]) => /^fp-[a-z0-9-]{1,40}$/.test(k) && typeof v === 'string');
  };
  const codeOf = req => normalizeSyncCode(req.headers['x-sync-code']);

  app.post('/api/save', (req, res) => {
    const data = req.body?.data ?? {};
    if (!validData(data)) return res.status(400).json({ error: 'bad_data' });
    let code;
    do { code = newSyncCode(); } while (read(code));
    const save = { version: 1, updatedAt: new Date().toISOString(), data };
    write(code, save);
    res.json({ code, version: save.version });
  });

  app.get('/api/save', (req, res) => {
    const code = codeOf(req);
    const save = code && read(code);
    if (!save) return res.status(404).json({ error: 'not_found' });
    res.json(save);
  });

  app.put('/api/save', (req, res) => {
    const code = codeOf(req);
    const save = code && read(code);
    if (!save) return res.status(404).json({ error: 'not_found' });
    const { data, baseVersion } = req.body ?? {};
    if (!validData(data)) return res.status(400).json({ error: 'bad_data' });
    // Another device saved since this one last synced: hand back theirs.
    if (Number(baseVersion) !== save.version) return res.status(409).json(save);
    const next = { version: save.version + 1, updatedAt: new Date().toISOString(), data };
    write(code, next);
    res.json({ version: next.version, updatedAt: next.updatedAt });
  });

  app.delete('/api/save', (req, res) => {
    const code = codeOf(req);
    if (!code || !read(code)) return res.status(404).json({ error: 'not_found' });
    rmSync(fileFor(code), { force: true });
    res.json({ ok: true });
  });
}
