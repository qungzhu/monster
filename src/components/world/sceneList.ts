/** The living-world scenes (3D sets in Scenes.tsx, skies in SceneBackdrop). */
export type SceneId = 'snow' | 'parlor' | 'rococo' | 'meadow' | 'hokkaido' | 'park' | 'camp';

export const SCENES: { id: SceneId; name: string; emoji: string; sky: string; swatch: string }[] = [
  { id: 'snow', name: '极光雪原', emoji: '🌌', sky: '', swatch: 'linear-gradient(160deg,#081230,#2c4468)' },
  { id: 'parlor', name: '法式复古房间', emoji: '🕯️', sky: 'linear-gradient(180deg,#2a1810 0%,#4a2c1a 60%,#6b4026 100%)', swatch: 'linear-gradient(160deg,#6b4026,#d9a86a)' },
  { id: 'rococo', name: '洛可可花园', emoji: '🌹', sky: 'linear-gradient(180deg,#bfe0f2 0%,#f7dbe6 55%,#fde9dc 100%)', swatch: 'linear-gradient(160deg,#f7dbe6,#9cc98a)' },
  { id: 'meadow', name: '天山草原森林', emoji: '🌲', sky: 'linear-gradient(180deg,#5aa3e0 0%,#9cd0f0 50%,#dcefd8 100%)', swatch: 'linear-gradient(160deg,#5aa3e0,#6fa548)' },
  { id: 'hokkaido', name: '北海道粉雪', emoji: '❄️', sky: 'linear-gradient(180deg,#8796c4 0%,#c7b8d8 45%,#f2cfc8 100%)', swatch: 'linear-gradient(160deg,#8796c4,#f2cfc8)' },
  { id: 'park', name: '蝴蝶花园公园', emoji: '🦋', sky: 'linear-gradient(180deg,#6bb8ee 0%,#a8dcf5 55%,#e6f6e0 100%)', swatch: 'linear-gradient(160deg,#6bb8ee,#7fbf58)' },
  { id: 'camp', name: '星空露营地', emoji: '🏕️', sky: 'linear-gradient(180deg,#0b1030 0%,#2a2a5c 45%,#7a4a6a 80%,#d8875e 100%)', swatch: 'linear-gradient(160deg,#2a2a5c,#d8875e)' },
];

const KEY = 'fp-scene';

export function loadScene(): SceneId {
  try {
    const v = localStorage.getItem(KEY);
    if (v && SCENES.some(s => s.id === v)) return v as SceneId;
  } catch { /* storage blocked */ }
  return 'snow';
}

export function saveScene(id: SceneId) {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
}
