import { IosLockScreenCard } from './IosLockScreenCard';

/**
 * Simulator self-test (build with VITE_LOCKSCREEN_SELFTEST=1, used by
 * .github/workflows/ios-simulator.yml): skips the app, renders the widget
 * picture, then makes and saves the Live Photo, logging each step to the
 * console so CI can follow along.
 */
export function LockScreenSelfTest() {
  const log = (event: string) => console.log(`[lockscreen-selftest] ${event}`);
  return (
    <div className="min-h-screen bg-[#0b1530] p-4 pt-16 text-white">
      <h1 className="mb-3 text-sm font-bold">锁屏宠物自检</h1>
      <IosLockScreenCard
        petName="雪糕"
        pet={{ characterId: 'xiaoxue', breedId: 'plush-himalayan', customBreed: null }}
        intimacy={3}
        autoStart
        onReport={log}
      />
    </div>
  );
}
