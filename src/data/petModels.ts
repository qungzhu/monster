export interface GLBModelConfig {
  /** Path under public/, e.g. /models/fox.glb */
  url: string;
  /** Uniform scale to normalize the model to ~1.2 unit height */
  scale: number;
  /** Vertical offset so feet rest at y=-0.65 (ground plane) */
  yOffset: number;
  /** Y rotation in radians (face the camera) */
  rotationY?: number;
  /** Animation clip name to loop when idle */
  idleAnimation: string;
  /** Animation clip name to play on hover/interaction */
  hoverAnimation: string;
  /** Playback speed multiplier */
  timeScale?: number;
}

/**
 * GLB model registry. Characters listed here render a professional
 * skinned+animated GLB; anyone missing falls back to the procedural
 * toon model automatically.
 *
 * To add a model: drop a .glb into public/models/ and register it here.
 * Good sources: quaternius.com (CC0), poly.pizza, sketchfab.com (filter
 * by downloadable + CC license). Check animation clip names with:
 *   node -e "const b=require('fs').readFileSync('public/models/x.glb');
 *     console.log(JSON.parse(b.slice(20,20+b.readUInt32LE(12))).animations.map(a=>a.name))"
 */
export const glbModels: Record<string, GLBModelConfig> = {
  // 团团 — animated fox (model: PixelMannen CC0, rig/animation: @tomkranis CC-BY 4.0,
  // via KhronosGroup/glTF-Sample-Assets)
  tuantuan: {
    url: '/models/fox.glb',
    scale: 0.0135,
    yOffset: -0.65,
    rotationY: 0.5,
    idleAnimation: 'Survey',
    hoverAnimation: 'Run',
    timeScale: 1,
  },
  // 小雪 — drop public/models/cat.glb and register here
  // 棉花糖 — drop public/models/hamster.glb and register here
};

export function hasGLBModel(characterId: string): boolean {
  return characterId in glbModels;
}
