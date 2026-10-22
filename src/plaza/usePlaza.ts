import { useCallback, useEffect, useRef, useState } from 'react';
import { plazaDeviceKey, plazaSocketUrl } from './protocol';
import type { BondReward, Friend, Interaction, InteractKind, Peer, PlazaAction, ServerMessage } from './protocol';

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
export function usePlaza(
  identity: { name: string; petName: string; breed: string } | null,
  /** Called once per earned bond reward (gained > 0) — feeds main-app growth. */
  onReward?: (r: BondReward) => void,
) {
  const [status, setStatus] = useState<PlazaStatus>('connecting');
  const [selfId, setSelfId] = useState<string | null>(null);
  const [room, setRoom] = useState<number | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const targets = useRef(new Map<string, RemoteTarget>());
  // Active pair interactions: ref for per-frame reads, state for the FX layer.
  const interactionsRef = useRef<Interaction[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [invite, setInvite] = useState<{ from: string; kind: InteractKind; name: string; petName: string; at: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ to: string; kind: InteractKind } | null>(null);
  const petNames = useRef(new Map<string, string>());
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const socket = useRef<WebSocket | null>(null);
  // Friendship: per-session level for name badges, full list for the panel.
  const [bonds, setBonds] = useState<Map<string, { total: number; level: number; todayLeft: number }>>(new Map());
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reward, setReward] = useState<BondReward | null>(null);
  const onRewardRef = useRef(onReward);
  useEffect(() => { onRewardRef.current = onReward; }, [onReward]);

  useEffect(() => {
    if (!identity) return;
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    let myId: string | null = null;
    const connect = () => {
      setStatus('connecting');
      const ws = new WebSocket(plazaSocketUrl());
      socket.current = ws;

      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', ...identity, key: plazaDeviceKey() }));

      ws.onmessage = e => {
        let msg: ServerMessage;
        try { msg = JSON.parse(e.data); } catch { return; }
        switch (msg.t) {
          case 'welcome':
            myId = msg.id;
            for (const p of msg.peers) petNames.current.set(p.id, p.petName);
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
            petNames.current.set(msg.peer.id, msg.peer.petName);
            targets.current.set(msg.peer.id, { x: msg.peer.x, z: msg.peer.z, ry: msg.peer.ry, action: msg.peer.action });
            setPeers(list => [...list.filter(p => p.id !== msg.peer.id), msg.peer]);
            break;
          case 'left':
            targets.current.delete(msg.id);
            setPeers(list => list.filter(p => p.id !== msg.id));
            break;
          case 'invited':
            setInvite({ from: msg.from, kind: msg.kind, name: msg.name, petName: msg.petName, at: Date.now() });
            break;
          case 'error':
            setPendingInvite(null);
            setNotice(msg.message);
            break;
          case 'declined':
            setPendingInvite(null);
            setNotice(`${msg.petName} 现在不太想玩,下次吧~`);
            break;
          case 'interact': {
            const it: Interaction = { ...msg, start: performance.now() };
            if (it.a === myId || it.b === myId) {
              const other = petNames.current.get(it.a === myId ? it.b : it.a) ?? '小伙伴';
              setPendingInvite(null);
              setNotice(`${it.kind === 'rub' ? '💕' : '🎾'} 和 ${other} ${it.kind === 'rub' ? '一起蹭蹭' : '一起玩'}!`);
            }
            interactionsRef.current = [...interactionsRef.current.filter(x => x.a !== it.a && x.b !== it.b), it];
            setInteractions(interactionsRef.current);
            setTimeout(() => {
              interactionsRef.current = interactionsRef.current.filter(x => x !== it);
              setInteractions(interactionsRef.current);
            }, it.duration + 200);
            break;
          }
          case 'bonds':
            setFriends(msg.list);
            break;
          case 'bond': {
            const { with: other, total, level, todayLeft } = msg;
            setBonds(prev => new Map(prev).set(other, { total, level, todayLeft }));
            if (msg.gained > 0 || msg.capped) {
              const r: BondReward = { petName: msg.petName, gained: msg.gained, total, level, levelUp: msg.levelUp, capped: msg.capped };
              setReward(r);
              if (msg.gained > 0) onRewardRef.current?.(r);
            }
            break;
          }
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

  const send = useCallback((obj: object) => {
    const ws = socket.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);
  const sendInvite = useCallback((to: string, kind: InteractKind) => {
    send({ t: 'invite', to, kind });
    setPendingInvite({ to, kind });
    clearTimeout(inviteTimer.current);
    inviteTimer.current = setTimeout(() => setPendingInvite(null), 15000);
  }, [send]);
  const sendReply = useCallback((from: string, accept: boolean) => {
    send({ t: 'reply', from, accept });
    setInvite(null);
  }, [send]);

  return {
    status, selfId, room, peers, targets, sendState,
    interactions, interactionsRef, invite, setInvite, notice, setNotice, pendingInvite, sendInvite, sendReply,
    bonds, friends, reward, setReward,
  };
}
