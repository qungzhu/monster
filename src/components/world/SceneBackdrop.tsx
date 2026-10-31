import { useMemo } from 'react';
import { WinterBackdrop } from './WinterBackdrop';
import { SCENES } from './sceneList';
import type { SceneId } from './sceneList';

/** The sky behind the 3D set (DOM/CSS, under the transparent canvas). */
export function SceneBackdrop({ scene }: { scene: SceneId }) {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: (i * 47) % 100, top: (i * 31) % 50, size: 1 + ((i * 13) % 10) / 6, delay: ((i * 7) % 40) / 10,
  })), []);
  if (scene === 'snow') return <WinterBackdrop />;
  const sky = SCENES.find(s => s.id === scene)?.sky;
  const day = scene === 'rococo' || scene === 'meadow' || scene === 'park';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: sky }} />
      {day && (
        <>
          <div className="absolute rounded-full" style={{ right: '14%', top: '8%', width: 60, height: 60, background: 'radial-gradient(circle,#fffbe8 0%,#fff1b8 60%,rgba(255,240,180,0) 72%)', boxShadow: '0 0 80px 40px rgba(255,244,200,0.45)' }} />
          {[[8, 12, 140], [52, 6, 110], [70, 20, 160], [24, 26, 120]].map(([l, t, w], i) => (
            <div key={i} className="absolute cloud-drift" style={{ left: `${l}%`, top: `${t}%`, width: w, height: w * 0.32, borderRadius: 999, background: 'rgba(255,255,255,0.85)', filter: 'blur(6px)', animationDelay: `${-i * 7}s` }} />
          ))}
        </>
      )}
      {scene === 'camp' && stars.map((s, i) => (
        <span key={i} className="star-twinkle absolute rounded-full bg-white" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
      ))}
      {scene === 'hokkaido' && (
        <div className="absolute inset-x-0 top-[30%] h-[30%]" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,210,190,0.55), transparent 70%)' }} />
      )}
      {scene === 'parlor' && (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 70%, rgba(255,190,120,0.25), transparent 65%)' }} />
      )}
    </div>
  );
}
