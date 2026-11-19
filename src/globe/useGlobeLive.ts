import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plazaDeviceKey, plazaSocketUrl } from '../plaza/protocol';
import { distanceKm } from './geo';
import type { HeatCell } from './geo';
import { CITIES, useMockPresence } from './presence';
import type { GlobePet, GlobeState } from './presence';

/**
 * The globe's feed. Connects to the real server (server/globe.js, next to
 * the plaza); while it can't, it shows the demo world instead and says so.
 * Everything privacy-related happens on the server: strangers arrive here
 * already blurred to their city, and this device's own position is only
 * ever sent while sharing is on.
 */

export type GlobeMode = 'connecting' | 'live' | 'demo';

interface LivePet { id: string; name: string; petName: string; breed: string; lat: number; lon: number; friend: boolean }
type ServerMsg =
  | { t: 'welcome'; id: string }
  | { t: 'view'; pets: LivePet[]; heat: HeatCell[]; online: number }
  | { t: 'waved'; from: string; name: string }
  | { t: 'error'; message: string };

export function globeSocketUrl() {
  return plazaSocketUrl().replace(/\/plaza-ws(\?.*)?$/, '/globe-ws');
}

/** Label for a (possibly blurred) spot: the nearest known city if close. */
function place(lat: number, lon: number) {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = distanceKm(lat, lon, c.lat, c.lon);
    if (d < bd) { bd = d; best = c; }
  }
  return bd < 80 ? { city: best.name, country: best.country } : { city: '', country: '' };
}

const ACTIONS: GlobePet['action'][] = ['Idle', 'Walk', 'Happy', 'Idle', 'Meow'];

interface Identity { name: string; petName: string; breed: string }

export function useGlobeLive(
  identity: Identity,
  share: boolean,
  pos: { lat: number; lon: number } | null,
  /** someone said hi to my cat */
  onWaved?: (from: { petName: string; name: string }) => void,
) {
  const demo = useMockPresence();
  const [mode, setMode] = useState<GlobeMode>('connecting');
  const [live, setLive] = useState<GlobeState>({ pets: [], heat: [], online: 0 });
  const ws = useRef<WebSocket | null>(null);
  const latest = useRef({ identity, share, pos, onWaved });
  useEffect(() => { latest.current = { identity, share, pos, onWaved }; });

  const send = useCallback((obj: object) => {
    const s = ws.current;
    if (s && s.readyState === WebSocket.OPEN) s.send(JSON.stringify(obj));
  }, []);

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const connect = () => {
      let socket: WebSocket;
      try { socket = new WebSocket(globeSocketUrl()); } catch { setMode('demo'); return; }
      ws.current = socket;
      // no answer soon: show the demo world while we keep trying
      const slow = setTimeout(() => { if (!closed) setMode(m => (m === 'live' ? m : 'demo')); }, 4000);
      socket.onopen = () => {
        const { identity: id, share: sh, pos: p } = latest.current;
        socket.send(JSON.stringify({ t: 'hello', key: plazaDeviceKey(), ...id, share: sh, ...(sh && p ? p : {}) }));
      };
      socket.onmessage = e => {
        let msg: ServerMsg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.t === 'welcome') { attempts = 0; clearTimeout(slow); setMode('live'); }
        else if (msg.t === 'view') {
          setLive({
            online: msg.online,
            heat: msg.heat,
            pets: msg.pets.map(p => ({
              ...p, ...place(p.lat, p.lon), lastSeen: 0,
              action: ACTIONS[p.id.charCodeAt(0) % ACTIONS.length],
            })),
          });
        } else if (msg.t === 'waved') latest.current.onWaved?.({ petName: msg.from, name: msg.name });
      };
      socket.onclose = () => {
        clearTimeout(slow);
        if (closed) return;
        setMode(m => (m === 'live' ? 'demo' : m === 'connecting' ? 'demo' : m));
        attempts++;
        retry = setTimeout(connect, Math.min(30_000, 2000 * 2 ** Math.min(attempts, 4)));
      };
    };
    connect();
    return () => { closed = true; clearTimeout(retry); ws.current?.close(); };
  }, []);

  // sharing switched / moved: tell the server (it holds nothing while hidden)
  useEffect(() => { send({ t: 'share', on: share }); }, [share, send]);
  useEffect(() => { if (share && pos) send({ t: 'pos', lat: pos.lat, lon: pos.lon }); }, [share, pos, send]);

  const wave = useCallback((to: string) => send({ t: 'wave', to }), [send]);
  const state = useMemo(() => (mode === 'live' ? live : demo), [mode, live, demo]);
  return { mode, state, wave };
}
