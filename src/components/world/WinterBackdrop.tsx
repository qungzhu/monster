import { useMemo } from 'react';

/**
 * Frozen-style night sky rendered entirely in DOM/CSS:
 * deep polar night gradient, animated aurora ribbons, twinkling
 * stars and a haloed moon. Sits behind the transparent WebGL canvas.
 */
export function WinterBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: ((i * 47) % 100),
        top: ((i * 31) % 58),
        size: 1 + ((i * 13) % 10) / 6,
        delay: ((i * 7) % 40) / 10,
        duration: 2 + ((i * 11) % 30) / 10,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Polar night sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #060d24 0%, #0b1638 30%, #16264f 55%, #24395f 75%, #31486b 100%)',
        }}
      />

      {/* Aurora ribbons */}
      <div className="absolute inset-x-0 top-0 h-[55%]" style={{ filter: 'blur(38px)', opacity: 0.55 }}>
        <div
          className="absolute w-[160%] h-[38%] -left-[30%] top-[6%] aurora-band"
          style={{
            background:
              'linear-gradient(100deg, transparent 0%, #34d399 25%, #22d3ee 50%, transparent 75%)',
            transform: 'rotate(-8deg)',
          }}
        />
        <div
          className="absolute w-[150%] h-[30%] -left-[20%] top-[22%] aurora-band-slow"
          style={{
            background:
              'linear-gradient(95deg, transparent 5%, #a78bfa 35%, #34d399 65%, transparent 90%)',
            transform: 'rotate(6deg)',
          }}
        />
        <div
          className="absolute w-[140%] h-[26%] -left-[15%] top-[38%] aurora-band"
          style={{
            background:
              'linear-gradient(105deg, transparent 10%, #22d3ee 45%, #818cf8 70%, transparent 92%)',
            transform: 'rotate(-4deg)',
            animationDelay: '-6s',
          }}
        />
      </div>

      {/* Stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white star-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Moon with halo */}
      <div
        className="absolute rounded-full"
        style={{
          right: '12%',
          top: '7%',
          width: 46,
          height: 46,
          background: 'radial-gradient(circle at 38% 35%, #ffffff 0%, #e8f1ff 55%, #cfe0f8 100%)',
          boxShadow: '0 0 32px 10px rgba(224, 238, 255, 0.35), 0 0 90px 36px rgba(180, 210, 255, 0.15)',
        }}
      />

      {/* Soft ground haze where sky meets the 3D snow field */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(102, 140, 196, 0.16) 55%, rgba(140, 175, 224, 0.28) 100%)',
        }}
      />
    </div>
  );
}
