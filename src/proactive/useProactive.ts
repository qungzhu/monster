import { useCallback, useEffect, useRef, useState } from 'react';
import type { LifeItem } from '../data/companion';
import type { Memory } from '../data/memory';
import { localTimeZone } from '../data/time';
import { buildJobs, defaultProactive } from './jobs';
import type { Job, ProactiveSettings } from './jobs';

export type PushStatus =
  | 'checking'
  | 'unsupported'   // browser has no Web Push (e.g. iOS Safari outside the home screen)
  | 'off'
  | 'denied'        // notifications blocked in browser settings
  | 'on'
  | 'unavailable';  // reminder server not reachable (e.g. static hosting)

const SETTINGS_KEY = 'fp-proactive';
const ENABLED_KEY = 'fp-push-enabled';
const DEVICE_KEY = 'fp-device-key';

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch { return fallback; }
}

/** Private random id for this device; the server only knows it by this. */
function deviceKey(): string {
  let k = localStorage.getItem(DEVICE_KEY);
  if (!k) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    k = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_KEY, k);
  }
  return k;
}

function b64urlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function post(path: string, body: object) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/**
 * Proactive care + offline reminders. Builds the upcoming jobs from the
 * owner's items/memories/settings; when notifications are on, keeps the
 * reminder server in sync; and forwards pushes that arrive while the app
 * is open to `onMessage` so the pet can say them.
 */
export function useProactive(opts: {
  items: LifeItem[];
  memories: Memory[];
  petName: string;
  onMessage: (job: Job) => void;
}) {
  const { items, memories, petName } = opts;
  const [settings, setSettingsState] = useState<ProactiveSettings>(() => load(SETTINGS_KEY, defaultProactive));
  const [status, setStatus] = useState<PushStatus>(supported() ? 'checking' : 'unsupported');
  const [upcoming, setUpcoming] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const subRef = useRef<PushSubscription | null>(null);
  const onMessageRef = useRef(opts.onMessage);
  useEffect(() => { onMessageRef.current = opts.onMessage; }, [opts.onMessage]);

  const setSettings = useCallback((patch: Partial<ProactiveSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // Restore an existing subscription.
  useEffect(() => {
    if (!supported()) return;
    let alive = true;
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (!alive) return;
      subRef.current = sub ?? null;
      if (Notification.permission === 'denied') setStatus('denied');
      else setStatus(sub && localStorage.getItem(ENABLED_KEY) === '1' ? 'on' : 'off');
    })().catch(() => { if (alive) setStatus('off'); });
    return () => { alive = false; };
  }, []);

  // Pushes that arrive while the app is open.
  useEffect(() => {
    if (!supported()) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'fp-push' && e.data.job?.body) onMessageRef.current(e.data.job as Job);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Rebuild jobs on every change; sync them while notifications are on.
  useEffect(() => {
    const tz = localTimeZone();
    const jobs = buildJobs({ items, memories, settings, petName, now: Date.now(), tz });
    const t = setTimeout(() => {
      setUpcoming(jobs);
      if (status !== 'on') return;
      post('/api/schedule/sync', { key: deviceKey(), tz, subscription: subRef.current?.toJSON(), jobs })
        .then(() => setError(''))
        .catch(() => setError('提醒服务器暂时连不上,稍后会自动重试'));
    }, 800);
    return () => clearTimeout(t);
  }, [items, memories, settings, petName, status]);

  const enable = useCallback(async () => {
    if (!supported()) return;
    setError('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'off'); return; }
      const keyRes = await fetch('/api/schedule/vapid').catch(() => null);
      if (!keyRes?.ok) { setStatus('unavailable'); return; }
      const { publicKey } = await keyRes.json();
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription()
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(publicKey) });
      subRef.current = sub;
      localStorage.setItem(ENABLED_KEY, '1');
      setStatus('on'); // the sync effect sends the subscription + jobs
    } catch {
      setError('开启失败:浏览器没能订阅推送,请稍后重试');
      setStatus('off');
    }
  }, []);

  const disable = useCallback(async () => {
    localStorage.removeItem(ENABLED_KEY);
    setStatus('off');
    try { await subRef.current?.unsubscribe(); } catch { /* already gone */ }
    subRef.current = null;
    // Delete everything the server kept for this device.
    await post('/api/schedule/forget', { key: deviceKey() }).catch(() => {});
  }, []);

  const sendTest = useCallback(async () => {
    setError('');
    try {
      await post('/api/schedule/test', { key: deviceKey(), body: `我是${petName},到时间我会这样提醒你~` });
    } catch {
      setError('测试通知没发出去,请检查网络或稍后重试');
    }
  }, [petName]);

  return { settings, setSettings, status, upcoming, error, enable, disable, sendTest };
}
