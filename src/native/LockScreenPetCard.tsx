import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { hasPetWallpaper, openPetWallpaper, setWallpaperPet } from './petWallpaper';

interface LockScreenPetCardProps {
  petName: string;
  breedId: string | null;
}

/** "锁屏宠物": put the pet, in 3D, on the lock screen (Android app only). */
export function LockScreenPetCard({ petName, breedId }: LockScreenPetCardProps) {
  const [state, setState] = useState<{ supported: boolean; active: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasPetWallpaper() || !breedId) return;
    let live = true;
    void setWallpaperPet(breedId).then(s => { if (live) setState(s); }).catch(() => {});
    return () => { live = false; };
  }, [breedId]);

  if (!hasPetWallpaper()) return null;
  const open = () => {
    setError('');
    openPetWallpaper().catch((e: unknown) => setError(e instanceof Error ? e.message : '打不开壁纸设置'));
  };
  return (
    <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[.07] p-3" aria-label="锁屏宠物">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <Smartphone size={13} className="text-sky-300" />锁屏宠物
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
            {state?.active
              ? `${petName}已经住在你的锁屏上啦，点一下它会跳起来`
              : state && !state.supported
                ? `${petName}的 3D 形象还没做好锁屏版，先由雪糕代班`
                : `让${petName}以 3D 形象出现在锁屏和桌面上`}
          </span>
        </span>
        <button type="button" onClick={open} className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white">
          {state?.active ? '重新设置' : '设为壁纸'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
