import { useCallback, useEffect, useRef, useState } from 'react';
import { plazaSocketUrl } from './protocol';
import type { Peer, PlazaAction, ServerMessage } from './protocol';

export type PlazaStatus = 'connecting' | 'online' | 'offline';

/** Latest network snapshot of a remote cat; rendering interpolates toward it. */
export interface RemoteTarget {
  x: number;
  z: number;
  ry: number;
  action: PlazaAction;
}

/**
 * Connection to the shared plaza. Remote cat positions live in a ref (they
 * change 10x/s and are read every frame), while the peer *list* is React
 * state so cats mount/unmount and the HUD count updates.
 */
export function usePlaza(identity: { name: string; petName: string; breed: string } | null) {
  const [status, setStatus] = useState<PlazaStatus>('connecting');
  const [selfId, setSelfId] = useState<string | null>(null);
  const [room, setRoom] = useState<number | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const targets = useRef(new Map<string, RemoteTarget>());
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!identity) return;
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus('connecting');
      const ws = new WebSocket(plazaSocketUrl());
      socket.current = ws;

      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', ...identity }));

      ws.onmessage = e => {
        let msg: ServerMessage;
        try { msg = JSON.parse(e.data); } catch { return; }
        switch (msg.t) {
          case 'welcome':
            setSelfId(msg.id);
            setStatus('online');
            targets.current.clear();
            for (const p of msg.peers) targets.current.set(p.id, { x: p.x, z: p.z, ry: p.ry, action: p.action });
            setPeers(msg.peers);
            break;
          case 'room':
            setRoom(msg.number);
            break;
          case 'joined':
            targets.current.set(msg.peer.id, { x: msg.peer.x, z: msg.peer.z, ry: msg.peer.ry, action: msg.peer.action });
            setPeers(list => [...list.filter(p => p.id !== msg.peer.id), msg.peer]);
            break;
          case 'left':
            targets.current.delete(msg.id);
            setPeers(list => list.filter(p => p.id !== msg.id));
            break;
          case 'states':
            for (const [id, x, z, ry, action] of msg.list) {
              const t = targets.current.get(id);
              if (t) { t.x = x; t.z = z; t.ry = ry; t.action = action; }
            }
            break;
        }
      };

      ws.onclose = () => {
        socket.current = null;
        setSelfId(null);
        setStatus('offline');
        if (!closedByUs) retry = setTimeout(connect, 2000); // auto-reconnect
      };
    };

    connect();
    return () => {
      closedByUs = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [identity]);

  const sendState = useCallback((x: number, z: number, ry: number, action: PlazaAction) => {
    const ws = socket.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'state', x, z, ry, action }));
  }, []);

  return { status, selfId, room, peers, targets, sendState };
}
