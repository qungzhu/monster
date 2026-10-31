import { Capacitor, registerPlugin } from '@capacitor/core';

/** Native side: android/app/src/main/java/com/furrypal/app/wallpaper/. */
interface PetWallpaperPlugin {
  /** Which pet the 3D wallpaper shows; supported=false when it has no wallpaper model. */
  setPet(options: { breedId: string }): Promise<{ supported: boolean; active: boolean }>;
  /** Whether the 3D pet is the current wallpaper. */
  status(): Promise<{ active: boolean }>;
  /** Opens the system preview to set it as wallpaper (home + lock screen). */
  open(): Promise<void>;
}

const PetWallpaper = registerPlugin<PetWallpaperPlugin>('PetWallpaper');

/** The 3D live wallpaper exists only in the Android app. */
export const hasPetWallpaper = () => Capacitor.getPlatform() === 'android';

export const setWallpaperPet = (breedId: string) =>
  hasPetWallpaper() ? PetWallpaper.setPet({ breedId }) : Promise.resolve({ supported: false, active: false });

export const wallpaperStatus = () =>
  hasPetWallpaper() ? PetWallpaper.status() : Promise.resolve({ active: false });

export const openPetWallpaper = () => PetWallpaper.open();
