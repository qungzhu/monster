/**
 * Cloud save with a sync code (see server/saves.js). The app keeps working
 * from localStorage as before; this mirrors the owner's data to the server
 * so a new phone (or a cleared browser) can bring it all back.
 *
 * Only the keys below are synced. Device-only things stay put: the API key,
 * push subscription, device/plaza identities and sound on/off.
 */
import { apiHeaders, apiUrl } from '../utils/apiBase';

export const SYNCED_KEYS = [
  'fp-selected-character', 'fp-chat-history', 'fp-mood-entries', 'fp-intimacy-levels', 'fp-user-name',
  'fp-checked-in', 'fp-check-in-streak', 'fp-last-check-in-date', 'fp-coins', 'fp-xp', 'fp-pet-stats',
  'fp-quest-progress', 'fp-last-stat-decay', 'fp-inventory', 'fp-adopted-breed', 'fp-custom-pet',
  'fp-generated-pet', 'fp-hub-name', 'fp-agent-runs', 'fp-companion-role', 'fp-life-items', 'fp-memories',
  'fp-memory-enabled', 'fp-scene', 'fp-proactive',
] as const;

const CODE_KEY = 'fp-sync-code';
const VERSION_KEY = 'fp-sync-version';
const LAST_PUSHED_KEY = 'fp-sync-last';

type Snapshot = Record<string, string>;

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const del = (k: string) => { try { localStorage.removeItem(k); } catch { /* storage blocked */ } };

export function snapshot(): Snapshot {
  const data: Snapshot = {};
  for (const k of SYNCED_KEYS) {
    const v = get(k);
    if (v !== null) data[k] = v;
  }
  return data;
}

/** Replace local data with a save. The caller reloads the page after. */
export function applySnapshot(data: Snapshot) {
  for (const k of SYNCED_KEYS) {
    if (typeof data[k] === 'string') set(k, data[k]);
    else del(k);
  }
}

export const syncCode = () => get(CODE_KEY);

function remember(code: string, version: number, data: Snapshot) {
  set(CODE_KEY, code);
  set(VERSION_KEY, String(version));
  set(LAST_PUSHED_KEY, JSON.stringify(data));
}

async function call(method: string, code: string | null, body?: unknown) {
  return fetch(apiUrl('/api/save'), {
    method,
    headers: apiHeaders({
      'Content-Type': 'application/json',
      ...(code ? { 'X-Sync-Code': code } : {}),
    }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Turn on cloud save for this device's data. Returns the new code. */
export async function createCloudSave(): Promise<string> {
  const data = snapshot();
  const res = await call('POST', null, { data });
  if (!res.ok) throw new Error(`save_failed_${res.status}`);
  const { code, version } = await res.json();
  remember(code, version, data);
  return code;
}

/**
 * Bring a save onto this device (replaces what's here). Returns false when
 * the code doesn't exist. Reload the page afterwards to load it.
 */
export async function restoreCloudSave(rawCode: string): Promise<boolean> {
  const code = rawCode.trim().toUpperCase();
  const res = await call('GET', code);
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`restore_failed_${res.status}`);
  const save = await res.json();
  applySnapshot(save.data);
  remember(code, save.version, save.data);
  return true;
}

export type PushResult = 'saved' | 'unchanged' | 'replaced' | 'off' | 'error';

/**
 * Upload local changes. When another device saved first, its copy wins
 * and is applied here ('replaced' — reload to show it).
 */
export async function pushCloudSave(): Promise<PushResult> {
  const code = syncCode();
  if (!code) return 'off';
  const data = snapshot();
  const json = JSON.stringify(data);
  if (json === get(LAST_PUSHED_KEY)) return 'unchanged';
  try {
    const res = await call('PUT', code, { data, baseVersion: Number(get(VERSION_KEY)) || 0 });
    if (res.status === 409) {
      const theirs = await res.json();
      applySnapshot(theirs.data);
      remember(code, theirs.version, theirs.data);
      return 'replaced';
    }
    if (res.status === 404) {
      // The save was deleted elsewhere: stop syncing this device.
      disableCloudSave();
      return 'off';
    }
    if (!res.ok) return 'error';
    const { version } = await res.json();
    remember(code, version, data);
    return 'saved';
  } catch {
    return 'error';
  }
}

/** Stop syncing on this device (the save on the server stays). */
export function disableCloudSave() {
  del(CODE_KEY);
  del(VERSION_KEY);
  del(LAST_PUSHED_KEY);
}

/** Delete the save from the server and stop syncing. */
export async function deleteCloudSave(): Promise<void> {
  const code = syncCode();
  if (code) await call('DELETE', code).catch(() => undefined);
  disableCloudSave();
}

/**
 * Keep the cloud copy fresh: every 30 s if something changed, and when the
 * app goes to the background. Returns a stop function.
 */
export function startAutoSync(onReplaced: () => void): () => void {
  let busy = false;
  const tick = async () => {
    if (busy || !syncCode()) return;
    busy = true;
    try {
      if ((await pushCloudSave()) === 'replaced') onReplaced();
    } finally {
      busy = false;
    }
  };
  const onHide = () => { if (document.visibilityState === 'hidden') void tick(); };
  const timer = setInterval(tick, 30_000);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onHide);
  };
}
