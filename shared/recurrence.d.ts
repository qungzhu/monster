export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'monthly';
export const REPEATS: Repeat[];
export function localParts(ms: number, tz: string): { y: number; mo: number; d: number; h: number; mi: number; s: number; dow: number };
export function fromLocal(y: number, mo: number, d: number, h: number, mi: number, tz: string): number;
export function nextOccurrence(atMs: number, repeat: Repeat, tz: string): number;
export function rollForward(atMs: number, repeat: Repeat, tz: string, nowMs: number): number;
