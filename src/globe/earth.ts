import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

/**
 * The globe's look, drawn at runtime from Natural Earth country outlines
 * (world-atlas, public domain): soft pastel land with gentle borders on a
 * milky blue sea, Chinese labels on the big countries — a plush toy globe,
 * not a satellite photo.
 */

type Country = Feature<Polygon | MultiPolygon, { name: string }>;

let countriesPromise: Promise<Country[]> | null = null;
export function loadCountries() {
  countriesPromise ??= import('world-atlas/countries-110m.json').then(m => {
    const topo = (m.default ?? m) as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
    const fc = feature(topo, topo.objects.countries);
    return fc.features as Country[];
  });
  return countriesPromise;
}

/** Chinese names for labels and the "countries visited" list. */
export const COUNTRY_ZH: Record<string, string> = {
  China: '中国', Japan: '日本', 'South Korea': '韩国', 'North Korea': '朝鲜', Mongolia: '蒙古', Russia: '俄罗斯',
  India: '印度', Pakistan: '巴基斯坦', Thailand: '泰国', Vietnam: '越南', Malaysia: '马来西亚', Indonesia: '印度尼西亚',
  Philippines: '菲律宾', Australia: '澳大利亚', 'New Zealand': '新西兰', Kazakhstan: '哈萨克斯坦', Iran: '伊朗',
  'Saudi Arabia': '沙特阿拉伯', Turkey: '土耳其', Egypt: '埃及', Ethiopia: '埃塞俄比亚', Kenya: '肯尼亚', Nigeria: '尼日利亚',
  'South Africa': '南非', Algeria: '阿尔及利亚', Sudan: '苏丹', 'Dem. Rep. Congo': '刚果（金）', Libya: '利比亚',
  'United Kingdom': '英国', France: '法国', Germany: '德国', Italy: '意大利', Spain: '西班牙', Sweden: '瑞典', Norway: '挪威',
  Finland: '芬兰', Poland: '波兰', Ukraine: '乌克兰', Netherlands: '荷兰', Greenland: '格陵兰', Iceland: '冰岛',
  Canada: '加拿大', 'United States of America': '美国', Mexico: '墨西哥', Brazil: '巴西', Argentina: '阿根廷',
  Peru: '秘鲁', Colombia: '哥伦比亚', Chile: '智利', Venezuela: '委内瑞拉', Bolivia: '玻利维亚', Antarctica: '南极洲',
  Singapore: '新加坡', 'United Arab Emirates': '阿联酋', Madagascar: '马达加斯加', Myanmar: '缅甸', Afghanistan: '阿富汗',
  Taiwan: '中国', 'Hong Kong': '中国',
};
export const zhName = (en: string) => COUNTRY_ZH[en] ?? en;

/** Where to write each label (the map's own centroids drift off-shape). */
const LABELS: [string, number, number, number][] = [
  // name, lat, lon, size (1 = normal)
  ['俄罗斯', 62, 95, 1.6], ['中国', 35, 103, 1.4], ['加拿大', 60, -105, 1.5], ['美国', 39, -99, 1.4],
  ['巴西', -10, -53, 1.3], ['澳大利亚', -25, 134, 1.3], ['印度', 22, 79, 1.1], ['哈萨克斯坦', 48, 67, 0.9],
  ['蒙古', 46.5, 103, 0.9], ['阿根廷', -35, -65, 1], ['阿尔及利亚', 28, 2.5, 0.9], ['刚果（金）', -3, 23.5, 0.85],
  ['沙特阿拉伯', 24, 45, 0.85], ['墨西哥', 23.5, -102, 0.9], ['印度尼西亚', -1.5, 114, 0.9], ['苏丹', 15.5, 30, 0.8],
  ['利比亚', 27, 17.5, 0.8], ['伊朗', 32.5, 54, 0.85], ['秘鲁', -9.5, -75, 0.8], ['埃及', 26.5, 29.5, 0.8],
  ['南非', -30.5, 24, 0.8], ['埃塞俄比亚', 8.5, 39.5, 0.75], ['肯尼亚', 0.5, 38, 0.7], ['尼日利亚', 9.5, 8, 0.75],
  ['土耳其', 39, 35, 0.75], ['日本', 36.5, 138.5, 0.75], ['法国', 46.5, 2.5, 0.7], ['德国', 51, 10.3, 0.65],
  ['英国', 53.5, -2, 0.65], ['西班牙', 40, -3.7, 0.7], ['意大利', 42.8, 12.6, 0.6], ['瑞典', 63, 16, 0.65],
  ['芬兰', 64, 26, 0.6], ['乌克兰', 49, 31.5, 0.7], ['波兰', 52, 19.4, 0.6], ['挪威', 61.5, 9, 0.6],
  ['格陵兰', 73, -41, 1], ['南极洲', -80, 20, 1.2], ['韩国', 36.4, 127.8, 0.55], ['泰国', 15.5, 101, 0.65],
  ['越南', 15.8, 107.5, 0.55], ['新西兰', -42, 172.5, 0.6], ['智利', -30, -71.3, 0.6], ['哥伦比亚', 4, -73, 0.7],
  ['委内瑞拉', 7, -66, 0.65], ['马达加斯加', -19.5, 46.7, 0.6], ['巴基斯坦', 29.5, 69.5, 0.7], ['阿富汗', 33.8, 66, 0.6],
  ['缅甸', 21, 96, 0.6], ['冰岛', 64.9, -18.6, 0.55],
];

// pastel land tints; each country gets one, neighbours rarely match
const TINTS = ['#c4e8b0', '#bfe3c0', '#cdeab6', '#b7e0b4', '#d3ecbe', '#c0e6c8', '#c9e6ae'];

const W = 4096, H = 2048;
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

function ringPath(ctx: CanvasRenderingContext2D | Path2D, ring: number[][]) {
  // rings crossing the date line: draw with continuous longitudes, then
  // the caller paints the shape again shifted by a full turn
  let prev = ring[0][0];
  let shift = 0;
  ring.forEach(([lon, lat], i) => {
    if (i > 0) {
      if (lon - prev > 180) shift -= 360;
      else if (prev - lon > 180) shift += 360;
    }
    prev = lon;
    const x = px(lon + shift), y = py(lat);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function polygons(c: Country): number[][][][] {
  return c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates;
}

export async function makeEarthTexture(maxAnisotropy = 4): Promise<THREE.CanvasTexture> {
  const countries = await loadCountries();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // sea: milky blue, a touch deeper toward the equator, pale at the poles
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#d9f1fb');
  sea.addColorStop(0.18, '#a7dcf3');
  sea.addColorStop(0.5, '#86cdee');
  sea.addColorStop(0.82, '#a7dcf3');
  sea.addColorStop(1, '#e4f5fb');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  const draw = (fn: (dx: number) => void) => { for (const dx of [-W, 0, W]) fn(dx); };

  // every coastline (outer rings), in all three copies, as one path, so
  // the soft halo below costs a single blur instead of one per island
  const coast = new Path2D();
  const all = new Path2D();
  for (const dx of [-W, 0, W]) {
    for (const c of countries) for (const poly of polygons(c)) {
      poly.forEach((r, k) => {
        const p = new Path2D();
        ringPath(p, r);
        const m = new DOMMatrix().translate(dx, 0);
        if (k === 0) coast.addPath(p, m);
        all.addPath(p, m);
      });
    }
  }

  // soft shallow-water halo around every coast
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 14;
  ctx.filter = 'blur(6px)';
  ctx.stroke(coast);
  ctx.restore();

  // land
  countries.forEach((c, i) => {
    const name = c.properties?.name ?? '';
    const snowy = name === 'Antarctica' || name === 'Greenland';
    ctx.fillStyle = snowy ? '#f4f8fb' : TINTS[(i * 3) % TINTS.length];
    draw(dx => {
      ctx.save(); ctx.translate(dx, 0);
      for (const poly of polygons(c)) {
        ctx.beginPath();
        poly.forEach(r => ringPath(ctx, r));
        ctx.fill('evenodd');
      }
      ctx.restore();
    });
  });

  // far north / south: a dusting of snow over the land
  const snow = ctx.createLinearGradient(0, 0, 0, H);
  snow.addColorStop(0, 'rgba(255,255,255,0.75)');
  snow.addColorStop(0.12, 'rgba(255,255,255,0)');
  snow.addColorStop(0.88, 'rgba(255,255,255,0)');
  snow.addColorStop(1, 'rgba(255,255,255,0.75)');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = snow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // borders: thin, soft lilac like the stitching on a plush map
  ctx.strokeStyle = 'rgba(150,130,190,0.55)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke(all);

  // labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [name, lat, lon, size] of LABELS) {
    // squash toward the poles is undone on the sphere: widen the font there
    const stretch = 1 / Math.max(0.35, Math.cos((lat * Math.PI) / 180));
    ctx.save();
    ctx.translate(px(lon), py(lat));
    ctx.scale(stretch, 1);
    ctx.font = `600 ${Math.round(30 * size)}px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(name, 0, 0);
    ctx.fillStyle = 'rgba(90,96,120,0.85)';
    ctx.fillText(name, 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function inRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The country a point lies in (Chinese name), or null over the sea. */
export async function countryAt(lat: number, lon: number): Promise<string | null> {
  const countries = await loadCountries();
  for (const c of countries) {
    for (const poly of polygons(c)) {
      if (inRing(lon, lat, poly[0]) && !poly.slice(1).some(h => inRing(lon, lat, h))) return zhName(c.properties.name);
    }
  }
  return null;
}
