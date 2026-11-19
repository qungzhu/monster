import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowLeft, Footprints, Layers, LocateFixed, Shield, X } from 'lucide-react';
import { GlobeScene } from '../globe/GlobeScene';
import { distanceKm } from '../globe/geo';
import { countryAt } from '../globe/earth';
import { nearestCity, recordVisit } from '../globe/presence';
import { useGlobeLive } from '../globe/useGlobeLive';
import type { GlobePet } from '../globe/presence';
import { PLAZA_BREEDS } from '../plaza/protocol';

const CORAL = '#f0566a';
const SHARE_KEY = 'fp-globe-share';

type Share = 'off' | 'on';
const readShare = (): Share | null => {
  try { const v = localStorage.getItem(SHARE_KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; }
};

const breedLabel = (id: string) => (PLAZA_BREEDS.find(b => b.id === id)?.label ?? '小猫').split(' · ')[0];
const ago = (m: number) => (m === 0 ? '在线' : m < 60 ? `${m} 分钟前在线` : `${Math.floor(m / 60)} 小时前在线`);

interface Props {
  userName: string;
  petName: string;
  adoptedBreedId: string | null;
}

/**
 * 毛球地球: everyone's cats on a plush globe, live. Friends appear where
 * they are; strangers only at their city (blurred); a heat map shows where
 * the crowds are. Your own cat only appears once you switch sharing on.
 */
export function Globe({ userName, petName, adoptedBreedId }: Props) {
  const [share, setShare] = useState<Share | null>(readShare);
  const [privacyOpen, setPrivacyOpen] = useState(() => readShare() === null);
  const [myPos, setMyPos] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [visited, setVisited] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fp-globe-visited') || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; n: number } | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const myBreed = PLAZA_BREEDS.some(b => b.id === adoptedBreedId) ? adoptedBreedId! : PLAZA_BREEDS[0].id;
  const identity = useMemo(() => ({ name: userName || '铲屎官', petName: petName || '小猫', breed: myBreed }), [userName, petName, myBreed]);
  const { mode, state: world, wave } = useGlobeLive(identity, share === 'on', share === 'on' ? myPos : null,
    w => { setToast(`${w.name} 的 ${w.petName} 向你打招呼 👋`); setTimeout(() => setToast(null), 3000); });

  const flyTo = (lat: number, lon: number) => setFocus(f => ({ lat, lon, n: (f?.n ?? 0) + 1 }));
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 2200); };

  const saveShare = (v: Share) => {
    setShare(v);
    try { localStorage.setItem(SHARE_KEY, v); } catch { /* private mode */ }
  };

  // When sharing is on: ask the device where we are. Rounded to ~100 m
  // here; the server blurs it further for everyone but friends.
  const locate = () => {
    if (!navigator.geolocation) { say('这台设备拿不到位置'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocating(false);
        const pos = { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) };
        setMyPos(pos);
        flyTo(pos.lat, pos.lon);
      },
      () => {
        setLocating(false);
        if (mode === 'live') {
          // never put someone somewhere they aren't on the real map
          saveShare('off');
          say('没拿到定位权限，你的猫暂时不会出现在地球上');
          return;
        }
        // demo world: stand in Shanghai so it still works
        const c = nearestCity(31.23, 121.47);
        setMyPos({ lat: c.lat, lon: c.lon });
        flyTo(c.lat, c.lon);
        say('没拿到定位权限，先把你放在上海（演示）');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  };
  // sharing was already on from an earlier visit: locate once on arrival
  useEffect(() => {
    if (readShare() !== 'on') return;
    const t = setTimeout(locate, 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // countries visited: recorded on this device only
  useEffect(() => {
    if (!myPos) return;
    countryAt(myPos.lat, myPos.lon).then(c => { if (c) setVisited(recordVisit(c)); });
  }, [myPos]);

  const me = share === 'on' && myPos
    ? { id: 'me', breed: myBreed, lat: myPos.lat, lon: myPos.lon, name: userName || '我', petName: petName || '我的猫', lastSeen: 0, action: 'Happy' as const, friend: true }
    : null;

  // fixed order (not by who's online), so avatars don't jump around under a finger
  const friends = useMemo(() => world.pets.filter(p => p.friend), [world.pets]);
  const sel: GlobePet | null = selected && selected !== 'me' ? world.pets.find(p => p.id === selected) ?? null : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070b1d] text-slate-900">
      <Canvas camera={{ position: [0.9, 1.1, 2.6], fov: 45, near: 0.01, far: 200 }} dpr={[1, 2]}
        // ?still=1: render only on change (screenshots on software GL)
        frameloop={new URLSearchParams(location.search).has('still') ? 'demand' : 'always'}
        onPointerMissed={() => setSelected(null)}>
        <GlobeScene pets={world.pets} me={me} heat={world.heat} showHeat={showHeat}
          selectedId={selected} focus={focus}
          onSelect={id => {
            setSelected(id);
            const p = id === 'me' ? me : world.pets.find(x => x.id === id);
            if (p) flyTo(p.lat, p.lon);
          }} />
      </Canvas>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button onClick={() => { location.href = '/'; }} aria-label="返回"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="pointer-events-auto rounded-2xl bg-white px-4 py-2 text-center shadow-lg">
          <div className="text-[15px] font-bold">毛球地球</div>
          <div className="text-[11px] text-slate-500">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            全球 {world.online.toLocaleString()} 只毛球在线
          </div>
        </div>
        <button onClick={() => setPrivacyOpen(true)} aria-label="位置隐私"
          className="pointer-events-auto flex h-10 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold shadow-lg"
          style={{ color: share === 'on' ? CORAL : '#64748b' }}>
          <Shield size={16} /> {share === 'on' ? '分享中' : '隐身'}
        </button>
      </div>

      <div className="pointer-events-none absolute left-3 top-[76px] rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white/85">
        {mode === 'live' ? `实时在线 · ${world.pets.length} 只猫在地球上` : mode === 'connecting' ? '正在连接…' : '演示：暂时连不上服务器，显示的是模拟数据'}
      </div>

      {/* right-side tools */}
      <div className="absolute bottom-[132px] right-3 flex flex-col gap-3">
        <button onClick={() => setShowHeat(h => !h)} aria-label="热力图"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg"
          style={{ color: showHeat ? CORAL : '#64748b' }}>
          <Layers size={22} />
        </button>
        <button aria-label="回到我的位置"
          onClick={() => {
            if (share !== 'on') { setPrivacyOpen(true); return; }
            if (myPos) { flyTo(myPos.lat, myPos.lon); setSelected('me'); } else locate();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg" style={{ color: CORAL }}>
          <LocateFixed size={22} className={locating ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* bottom: countries + friends */}
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white shadow-lg"
          style={{ background: CORAL }}>
          <Footprints size={15} /> 去过 {visited.length} 个国家
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {friends.length === 0 && (
            <div className="rounded-2xl bg-white/90 px-3 py-2 text-[12px] text-slate-600 shadow-lg">
              还没有好友在地球上 · 去
              <button onClick={() => { location.href = '/plaza'; }} className="mx-0.5 font-semibold" style={{ color: CORAL }}>雪原广场</button>
              和别的猫一起玩，成为好友后会出现在这里
            </div>
          )}
          {friends.map(f => (
            <button key={f.id} onClick={() => { setSelected(f.id); flyTo(f.lat, f.lon); }}
              className="relative flex w-14 shrink-0 flex-col items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-lg"
                style={selected === f.id ? { boxShadow: `0 0 0 3px ${CORAL}` } : undefined}>
                🐱
              </span>
              {f.lastSeen === 0 && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
              <span className="mt-1 max-w-full truncate text-[11px] font-medium text-white">{f.petName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* profile card */}
      {(sel || (selected === 'me' && me)) && (
        <div className="absolute inset-x-3 bottom-[118px] z-30 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
          <button onClick={() => setSelected(null)} aria-label="关闭" className="absolute right-3 top-3 text-slate-400"><X size={18} /></button>
          {sel ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{sel.petName}</h3>
                {sel.friend && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: CORAL }}>好友</span>}
              </div>
              <p className="text-[13px] text-slate-500">{breedLabel(sel.breed)} · 主人 {sel.name}</p>
              <p className="mt-2 text-[13px]">
                📍 {sel.friend
                  ? (`${sel.country} ${sel.city}`.trim() || '好友的位置')
                  : `${sel.city || sel.country || '某个城市'}（城市级位置）`}
                {sel.friend && me && <span className="text-slate-500"> · 离你 {Math.round(distanceKm(me.lat, me.lon, sel.lat, sel.lon)).toLocaleString()} km</span>}
              </p>
              <p className={`text-[12px] ${sel.lastSeen === 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{ago(sel.lastSeen)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => {
                  if (mode === 'live') wave(sel.id);
                  say(`已向 ${sel.petName} 打招呼 👋${mode === 'live' ? '' : '（演示）'}`);
                }}
                  className="flex-1 rounded-xl py-2.5 text-[14px] font-semibold text-white" style={{ background: CORAL }}>
                  打个招呼
                </button>
                <button onClick={() => { location.href = '/plaza'; }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold">
                  约去雪原广场
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold">{me!.petName}（我）</h3>
              <p className="text-[13px] text-slate-500">好友能看到你大致的位置；陌生人只看到你所在的城市。</p>
              <button onClick={() => { saveShare('off'); setSelected(null); }}
                className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-[14px] font-semibold">
                切换到隐身
              </button>
            </>
          )}
        </div>
      )}

      {/* privacy sheet: opt-in before your cat shows up anywhere */}
      {privacyOpen && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => share && setPrivacyOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">让你的猫出现在地球上？</h3>
            <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
              <li>💛 <b>好友</b>能看到你大致在哪里（精确到街区）</li>
              <li>🏙️ <b>陌生人</b>只能看到你所在的城市，位置还会偏移几公里</li>
              <li>🕒 只显示你在线时的位置，不保存行动轨迹</li>
              <li>👻 随时可以切回隐身，你的猫会立刻从地图上消失</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { saveShare('off'); setPrivacyOpen(false); }}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-[14px] font-semibold">
                先隐身看看
              </button>
              <button onClick={() => { saveShare('on'); setPrivacyOpen(false); locate(); }}
                className="flex-1 rounded-xl py-3 text-[14px] font-semibold text-white" style={{ background: CORAL }}>
                开启位置分享
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-2 text-[13px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
