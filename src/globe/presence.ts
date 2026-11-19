import { useEffect, useMemo, useState } from 'react';
import { PLAZA_BREEDS } from '../plaza/protocol';
import { blurToCity, hash01, heatGrid } from './geo';
import type { HeatCell } from './geo';

/**
 * Who is online on the globe. This first version runs on made-up players
 * (MOCK), shaped exactly like what the server will send later:
 *  - friends with their (lightly rounded) real position,
 *  - strangers only as a blurred city spot (see blurToCity),
 *  - a heat grid of online counts, thin cells dropped.
 * Swapping in the real feed means replacing useMockPresence with a
 * WebSocket on the plaza server that sends the same GlobeState.
 */

export interface City { name: string; country: string; lat: number; lon: number; weight: number }

export const CITIES: City[] = [
  { name: '上海', country: '中国', lat: 31.23, lon: 121.47, weight: 9 },
  { name: '北京', country: '中国', lat: 39.9, lon: 116.4, weight: 8 },
  { name: '广州', country: '中国', lat: 23.13, lon: 113.26, weight: 6 },
  { name: '深圳', country: '中国', lat: 22.54, lon: 114.06, weight: 6 },
  { name: '成都', country: '中国', lat: 30.57, lon: 104.07, weight: 5 },
  { name: '杭州', country: '中国', lat: 30.27, lon: 120.15, weight: 5 },
  { name: '武汉', country: '中国', lat: 30.59, lon: 114.31, weight: 4 },
  { name: '西安', country: '中国', lat: 34.34, lon: 108.94, weight: 3 },
  { name: '乌鲁木齐', country: '中国', lat: 43.83, lon: 87.62, weight: 1 },
  { name: '台北', country: '中国', lat: 25.03, lon: 121.56, weight: 3 },
  { name: '香港', country: '中国', lat: 22.32, lon: 114.17, weight: 3 },
  { name: '东京', country: '日本', lat: 35.68, lon: 139.69, weight: 6 },
  { name: '大阪', country: '日本', lat: 34.69, lon: 135.5, weight: 3 },
  { name: '札幌', country: '日本', lat: 43.06, lon: 141.35, weight: 2 },
  { name: '首尔', country: '韩国', lat: 37.57, lon: 126.98, weight: 4 },
  { name: '新加坡', country: '新加坡', lat: 1.35, lon: 103.82, weight: 3 },
  { name: '曼谷', country: '泰国', lat: 13.76, lon: 100.5, weight: 3 },
  { name: '吉隆坡', country: '马来西亚', lat: 3.14, lon: 101.69, weight: 2 },
  { name: '孟买', country: '印度', lat: 19.08, lon: 72.88, weight: 3 },
  { name: '悉尼', country: '澳大利亚', lat: -33.87, lon: 151.21, weight: 3 },
  { name: '墨尔本', country: '澳大利亚', lat: -37.81, lon: 144.96, weight: 2 },
  { name: '伦敦', country: '英国', lat: 51.51, lon: -0.13, weight: 4 },
  { name: '巴黎', country: '法国', lat: 48.86, lon: 2.35, weight: 3 },
  { name: '柏林', country: '德国', lat: 52.52, lon: 13.4, weight: 3 },
  { name: '阿姆斯特丹', country: '荷兰', lat: 52.37, lon: 4.9, weight: 2 },
  { name: '斯德哥尔摩', country: '瑞典', lat: 59.33, lon: 18.07, weight: 1 },
  { name: '罗马', country: '意大利', lat: 41.9, lon: 12.5, weight: 2 },
  { name: '伊斯坦布尔', country: '土耳其', lat: 41.01, lon: 28.98, weight: 2 },
  { name: '迪拜', country: '阿联酋', lat: 25.2, lon: 55.27, weight: 2 },
  { name: '开罗', country: '埃及', lat: 30.04, lon: 31.24, weight: 1 },
  { name: '内罗毕', country: '肯尼亚', lat: -1.29, lon: 36.82, weight: 1 },
  { name: '纽约', country: '美国', lat: 40.71, lon: -74.01, weight: 5 },
  { name: '洛杉矶', country: '美国', lat: 34.05, lon: -118.24, weight: 4 },
  { name: '旧金山', country: '美国', lat: 37.77, lon: -122.42, weight: 3 },
  { name: '西雅图', country: '美国', lat: 47.61, lon: -122.33, weight: 2 },
  { name: '温哥华', country: '加拿大', lat: 49.28, lon: -123.12, weight: 2 },
  { name: '多伦多', country: '加拿大', lat: 43.65, lon: -79.38, weight: 2 },
  { name: '墨西哥城', country: '墨西哥', lat: 19.43, lon: -99.13, weight: 1 },
  { name: '圣保罗', country: '巴西', lat: -23.55, lon: -46.63, weight: 2 },
  { name: '布宜诺斯艾利斯', country: '阿根廷', lat: -34.6, lon: -58.38, weight: 1 },
];

export interface GlobePet {
  id: string;
  name: string;          // owner
  petName: string;
  breed: string;         // plaza (lite model) breed id
  lat: number;
  lon: number;
  city: string;
  country: string;
  friend: boolean;
  /** Minutes since last seen online; 0 = online now. */
  lastSeen: number;
  action: 'Idle' | 'Walk' | 'Sleep' | 'Happy' | 'Meow';
}

export interface GlobeState {
  pets: GlobePet[];
  heat: HeatCell[];
  online: number;
}

const OWNERS = ['小雨', '阿橙', 'Mika', '团子', 'Leo', '暖暖', 'Yuki', '可乐', 'Nina', '豆豆', '星星', 'Sam',
  '果冻', 'Hana', '布丁妈', 'Ollie', '小鹿', 'Emma', '阿南', 'Kai', '栗子', 'Zoe', '糯米', 'Max', '芒果',
  'Lina', '小满', 'Theo', '木木', 'Aria', '十一', 'Jun', '汤圆', 'Mila'];
const PETS = ['奶糖', '煤球', '芝麻', '橘子', '雪球', '年糕', '咖啡', '棉花', '可可', '饭团', '豆包', '月饼',
  '小虎', '泡芙', '麻薯', '花卷', '黑豆', '松饼', '糖糖', '布丁', '奥利奥', '肉松', '毛毛', '酥酥', '团团',
  '叮当', '球球', '甜甜', '阿福', '粥粥', '咪咪', '丸子', '大福', '栗栗'];
const ACTIONS: GlobePet['action'][] = ['Idle', 'Walk', 'Sleep', 'Happy', 'Meow'];

function pickCity(r: number) {
  const total = CITIES.reduce((s, c) => s + c.weight, 0);
  let x = r * total;
  for (const c of CITIES) { x -= c.weight; if (x <= 0) return c; }
  return CITIES[0];
}

/** Everyone in the mock world: a few friends, many strangers, and a crowd
 *  that only shows up in the heat map. Deterministic, so it's stable. */
function buildWorld() {
  const shown: (GlobePet & { home: City })[] = [];
  for (let i = 0; i < OWNERS.length; i++) {
    const id = `mock-${i}`;
    const home = pickCity(hash01(id + 'c'));
    const friend = i < 6;
    // a real-looking position somewhere in the city (friends see this)
    const lat = home.lat + (hash01(id + 'y') - 0.5) * 0.12;
    const lon = home.lon + (hash01(id + 'x') - 0.5) * 0.12;
    shown.push({
      id, name: OWNERS[i], petName: PETS[i % PETS.length],
      breed: PLAZA_BREEDS[Math.floor(hash01(id + 'b') * PLAZA_BREEDS.length)].id,
      lat, lon, city: home.name, country: home.country, friend,
      lastSeen: hash01(id + 's') < 0.55 ? 0 : Math.ceil(hash01(id + 'm') * 90),
      action: ACTIONS[Math.floor(hash01(id + 'a') * ACTIONS.length)], home,
    });
  }
  const crowd: { lat: number; lon: number }[] = [];
  for (let i = 0; i < 900; i++) {
    const c = pickCity(hash01(`crowd${i}`));
    const spread = 1.5 + c.weight * 0.35;
    crowd.push({
      lat: c.lat + (hash01(`cy${i}`) - 0.5) * spread * 2,
      lon: c.lon + (hash01(`cx${i}`) - 0.5) * spread * 2,
    });
  }
  return { shown, crowd };
}

/** What this viewer is allowed to see: strangers blurred to their city. */
function viewOf(world: ReturnType<typeof buildWorld>, tick: number): GlobeState {
  const pets = world.shown.map(p => {
    // a little life: people come and go, cats change what they're doing
    const flip = hash01(`${p.id}:${Math.floor(tick / 3)}`);
    const lastSeen = flip < 0.12 ? (p.lastSeen === 0 ? 1 : 0) : p.lastSeen;
    const action = flip > 0.8 ? ACTIONS[Math.floor(flip * 97) % ACTIONS.length] : p.action;
    const pos = p.friend ? { lat: p.lat, lon: p.lon } : blurToCity(p.id, p.home);
    const { home: _home, ...rest } = p;
    void _home;
    return { ...rest, ...pos, lastSeen, action };
  });
  const online = world.crowd.length + pets.filter(p => p.lastSeen === 0).length;
  return { pets, heat: heatGrid([...world.crowd, ...pets]), online };
}

/** Live-feeling mock feed: refreshes every few seconds. */
export function useMockPresence(intervalMs = 4000): GlobeState {
  const world = useMemo(() => buildWorld(), []);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return useMemo(() => viewOf(world, tick), [world, tick]);
}

/** Countries (by name) the player has been seen in, kept on the device. */
const VISITED_KEY = 'fp-globe-visited';
export function recordVisit(country: string): string[] {
  let list: string[] = [];
  try { list = JSON.parse(localStorage.getItem(VISITED_KEY) || '[]'); } catch { /* none yet */ }
  if (!list.includes(country)) {
    list.push(country);
    try { localStorage.setItem(VISITED_KEY, JSON.stringify(list)); } catch { /* private mode */ }
  }
  return list;
}

/** The nearest known city to a point (used to place and label the player). */
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
