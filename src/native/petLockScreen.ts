import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * iOS lock screen: iOS has no third-party live wallpapers, so the app makes
 * a Live Photo of the pet (set it as the wallpaper from Photos) and keeps a
 * lock-screen / home-screen widget up to date.
 * Native side: ios/App/App/PetLockScreen/.
 */
interface PetLockScreenPlugin {
  /** Starts a Live Photo video of width x height at fps; stillIndex is the key photo. */
  beginLivePhoto(options: { width: number; height: number; fps: number; stillIndex: number }): Promise<void>;
  /** Appends JPEG frames (base64, no data: prefix), in order. */
  addFrames(options: { frames: string[] }): Promise<void>;
  /** Finishes the video, pairs it with the still and saves both to Photos. */
  finishLivePhoto(options: { still: string }): Promise<{ saved: boolean }>;
  /** Drops an unfinished Live Photo. */
  cancelLivePhoto(): Promise<void>;
  /** Pet shown by the widgets: PNG (base64, transparent background), name, intimacy. */
  setWidgetPet(options: { image?: string; petName: string; intimacy: number }): Promise<void>;
  /** Opens the Photos app so the Live Photo can be set as the wallpaper. */
  openPhotos(): Promise<void>;
}

const PetLockScreen = registerPlugin<PetLockScreenPlugin>('PetLockScreen');

export const hasPetLockScreen = () => Capacitor.getPlatform() === 'ios';

export { PetLockScreen };

/** Canvas -> base64 (no data: prefix). */
export function canvasBase64(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('无法读取画面')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }, type, quality);
  });
}
