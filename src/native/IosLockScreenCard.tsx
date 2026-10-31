import { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { LockScreenCapture } from './LockScreenCapture';
import type { PetVisual } from './LockScreenCapture';
import { canvasBase64, PetLockScreen } from './petLockScreen';

interface IosLockScreenCardProps {
  petName: string;
  pet: PetVisual;
  intimacy: number;
}

const FPS = 30;
const SECONDS = 3;
const FRAMES = FPS * SECONDS;
const STILL = Math.floor(FRAMES / 2);
const BATCH = 5;

/** Portrait size matching this phone's screen shape, 1080 px wide. */
function liveSize() {
  const ratio = window.screen.height / Math.max(1, window.screen.width);
  const h = Math.round((1080 * Math.min(2.2, Math.max(16 / 9, ratio))) / 2) * 2;
  return { width: 1080, height: h };
}

const petKey = (p: PetVisual) => `${p.characterId}|${p.breedId ?? ''}|${p.customBreed?.glbUrl ?? ''}`;

/**
 * "锁屏宠物" on iPhone. iOS doesn't let apps draw the wallpaper, so:
 *  - a Live Photo of the pet goes to Photos, to be set as the wallpaper
 *    (it moves when the screen wakes or is pressed);
 *  - the lock-screen / home-screen widget shows the pet, kept in sync here.
 */
export function IosLockScreenCard({ petName, pet, intimacy }: IosLockScreenCardProps) {
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'saving' | 'saved'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [widgetJob, setWidgetJob] = useState<string | null>(null);
  const size = useRef(liveSize());
  const batch = useRef<string[]>([]);
  const still = useRef('');
  const key = petKey(pet);

  // Widget picture: re-render whenever the pet changes.
  useEffect(() => { setWidgetJob(key); }, [key]);
  // Name / intimacy alone: no new picture needed.
  useEffect(() => {
    void PetLockScreen.setWidgetPet({ petName, intimacy }).catch(() => {});
  }, [petName, intimacy]);

  const onWidgetFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    const image = await canvasBase64(canvas, 'image/png');
    await PetLockScreen.setWidgetPet({ image, petName, intimacy });
  }, [petName, intimacy]);
  const widgetDone = useCallback(() => setWidgetJob(null), []);

  const onLiveFrame = useCallback(async (canvas: HTMLCanvasElement, i: number) => {
    const jpeg = await canvasBase64(canvas, 'image/jpeg', 0.9);
    if (i === STILL) still.current = jpeg;
    batch.current.push(jpeg);
    if (batch.current.length >= BATCH || i === FRAMES - 1) {
      const frames = batch.current;
      batch.current = [];
      await PetLockScreen.addFrames({ frames });
    }
    setProgress((i + 1) / FRAMES);
  }, []);

  const liveDone = useCallback(async () => {
    setPhase('saving');
    try {
      const { saved } = await PetLockScreen.finishLivePhoto({ still: still.current });
      if (!saved) throw new Error('没有保存到相册');
      setPhase('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
      setPhase('idle');
    }
  }, []);

  const liveFailed = useCallback((e: unknown) => {
    void PetLockScreen.cancelLivePhoto().catch(() => {});
    setError(e instanceof Error ? e.message : '生成失败');
    setPhase('idle');
  }, []);

  const make = async () => {
    setError('');
    setProgress(0);
    batch.current = [];
    still.current = '';
    size.current = liveSize();
    try {
      await PetLockScreen.beginLivePhoto({ ...size.current, fps: FPS, stillIndex: STILL });
      setPhase('rendering');
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法开始生成');
    }
  };

  const busy = phase === 'rendering' || phase === 'saving';
  return (
    <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[.07] p-3" aria-label="锁屏宠物">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <Smartphone size={13} className="text-sky-300" />锁屏宠物
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">
            {phase === 'rendering'
              ? `正在给${petName}拍实况照片… ${Math.round(progress * 100)}%`
              : phase === 'saving'
                ? '正在存到相册…'
                : phase === 'saved'
                  ? '已存到相册，按下面的步骤设为锁屏'
                  : `给${petName}拍一张会动的实况照片当锁屏`}
          </span>
        </span>
        <button
          type="button"
          onClick={phase === 'saved' ? () => void PetLockScreen.openPhotos().catch(() => {}) : make}
          disabled={busy}
          className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? '生成中' : phase === 'saved' ? '打开照片' : '生成锁屏'}
        </button>
      </div>
      {busy && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-sky-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {phase === 'saved' && (
        <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-[11px] leading-snug text-text-muted">
          <li>在「照片」里打开刚存的这张实况照片</li>
          <li>点左下角分享 → 「用作墙纸」</li>
          <li>确认左下角「实况」是打开的，点「添加」</li>
          <li>锁屏时按一下屏幕，{petName}就会动起来</li>
        </ol>
      )}
      <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
        还可以长按锁屏 → 自定 → 添加小组件 → 「毛茸伙伴」，让{petName}一直待在时钟下面。
      </p>
      {error && <p className="mt-1.5 text-[11px] text-rose-300">{error}</p>}
      {phase === 'rendering' && (
        <LockScreenCapture
          pet={pet} mode="live" {...size.current} fps={FPS} frameCount={FRAMES}
          onFrame={onLiveFrame} onDone={liveDone} onError={liveFailed}
        />
      )}
      {widgetJob && !busy && (
        <LockScreenCapture
          key={widgetJob}
          pet={pet} mode="widget" width={512} height={512} fps={FPS} frameCount={1}
          onFrame={onWidgetFrame} onDone={widgetDone} onError={widgetDone}
        />
      )}
    </div>
  );
}
