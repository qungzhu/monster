/**
 * Pet photo analysis: turns a photo/video of the user's real pet
 * into parametric 3D model params.
 *
 * Two tiers:
 *  - With an API key: Claude vision reads the photo (species, true
 *    fur colors, ear/tail shape, personality, a suggested name).
 *  - Without: local canvas color extraction + sensible defaults,
 *    fully offline. The studio lets the user adjust either result.
 */

export interface PetAnalysis {
  species: 'cat' | 'dog';
  bodyColor: string;
  accentColor: string;
  bellyColor: string;
  eyeColor: string;
  earStyle: string;
  tailStyle: 'wag' | 'curl';
  legScale: number;
  personality: string[];
  suggestedName: string;
  breedGuess: string;
}

const API_BASE = 'http://localhost:3001';

/** Grab a representative frame from a video file as a data URL. */
export function extractVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(video.duration / 2, 3);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 800 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    video.onerror = () => reject(new Error('video load failed'));
  });
}

/** Read an image file as a downscaled data URL (privacy + payload size). */
export function readImageScaled(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

function shade(hex: string, factor: number, towardWhite = false) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (towardWhite) {
    return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
  }
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Offline fallback: sample the center region of the photo and pick
 * the dominant fur color by coarse quantization; derive accent and
 * belly shades from it.
 */
export function analyzeLocally(dataUrl: string, species: 'cat' | 'dog'): Promise<PetAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      // Center crop: pets are usually centered in their photos
      const data = ctx.getImageData(size * 0.25, size * 0.25, size * 0.5, size * 0.5).data;

      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Skip near-black/near-white pixels (background, shadows)
        const lum = (r + g + b) / 3;
        if (lum < 25 || lum > 242) continue;
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        bucket.count++;
        bucket.r += r; bucket.g += g; bucket.b += b;
        buckets.set(key, bucket);
      }

      let best: { count: number; r: number; g: number; b: number } | null = null;
      for (const bucket of buckets.values()) {
        if (!best || bucket.count > best.count) best = bucket;
      }
      const bodyColor = best
        ? rgbToHex(best.r / best.count, best.g / best.count, best.b / best.count)
        : (species === 'cat' ? '#d8ccc0' : '#e8a838');

      resolve({
        species,
        bodyColor,
        accentColor: shade(bodyColor, 0.72),
        bellyColor: shade(bodyColor, 0.55, true),
        eyeColor: species === 'cat' ? '#E8A030' : '#3D2814',
        earStyle: species === 'cat' ? 'point' : 'floppy',
        tailStyle: 'wag',
        legScale: 1,
        personality: ['可爱', '独一无二', '我的宝贝'],
        suggestedName: species === 'cat' ? '咪咪' : '旺旺',
        breedGuess: '照片提取',
      });
    };
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = dataUrl;
  });
}

// ————— Meshy photo-to-mesh pipeline —————

export interface MeshyProgress {
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  glbUrl: string | null;
  error: string | null;
}

/** Kick off a Meshy image-to-3D task. Multiple angle photos
 *  (front/side/back, up to 4) produce far better geometry. */
export async function startMeshyGeneration(dataUrls: string | string[]): Promise<{ taskId: string; multi: boolean }> {
  const urls = Array.isArray(dataUrls) ? dataUrls : [dataUrls];
  const res = await fetch(`${API_BASE}/api/meshy/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrls: urls }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error === 'no_meshy_key' ? 'no_meshy_key' : `generate failed: ${res.status}`);
  }
  return res.json();
}

export async function pollMeshyStatus(taskId: string, multi = false): Promise<MeshyProgress> {
  const res = await fetch(`${API_BASE}/api/meshy/status/${taskId}?multi=${multi ? '1' : '0'}`);
  if (!res.ok) throw new Error(`status failed: ${res.status}`);
  return res.json();
}

/** Ask the backend to download the finished GLB into public/models/. */
export async function fetchMeshyModel(glbUrl: string, taskId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/meshy/fetch-model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glbUrl, taskId }),
  });
  if (!res.ok) throw new Error(`fetch-model failed: ${res.status}`);
  const { localUrl } = await res.json();
  return localUrl;
}

/** Claude-vision analysis via the local backend proxy. */
export async function analyzeWithAI(dataUrl: string, apiKey: string): Promise<PetAnalysis> {
  const [header, base64] = dataUrl.split(',');
  const mediaType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';

  const res = await fetch(`${API_BASE}/api/analyze-pet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ imageBase64: base64, mediaType }),
  });
  if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
  const result = await res.json();
  return {
    species: result.species === 'cat' ? 'cat' : 'dog',
    bodyColor: result.bodyColor ?? '#e8a838',
    accentColor: result.accentColor ?? '#c88828',
    bellyColor: result.bellyColor ?? '#fde8c0',
    eyeColor: result.eyeColor ?? '#3D2814',
    earStyle: result.earStyle ?? (result.species === 'cat' ? 'point' : 'floppy'),
    tailStyle: result.tailStyle === 'curl' ? 'curl' : 'wag',
    legScale: typeof result.legScale === 'number' ? Math.min(1, Math.max(0.5, result.legScale)) : 1,
    personality: Array.isArray(result.personality) ? result.personality.slice(0, 3) : ['可爱'],
    suggestedName: result.suggestedName ?? '小可爱',
    breedGuess: result.breedGuess ?? '',
  };
}
