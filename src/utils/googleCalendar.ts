export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  identityRequired?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
}

export interface GoogleCalendarEventDraft {
  summary: string;
  start: string;
  end: string;
  description?: string;
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'calendar_request_failed');
  return data;
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return readJson(await fetch('/api/connectors/google/status'));
}

export async function getGoogleCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  const data = await readJson(await fetch('/api/connectors/google/events'));
  return data.events || [];
}

export async function addGoogleCalendarEvent(event: GoogleCalendarEventDraft): Promise<GoogleCalendarEvent> {
  const data = await readJson(await fetch('/api/connectors/google/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  }));
  return data.event;
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await readJson(await fetch('/api/connectors/google/disconnect', { method: 'POST' }));
}

export function parseGoogleCalendarCommand(command: string, now = new Date()): GoogleCalendarEventDraft | null {
  if (!/日历|日程|会议|开会|预约/.test(command)) return null;

  const dayOffset = command.includes('后天') ? 2 : command.includes('明天') ? 1 : 0;
  const match = command.match(/(上午|下午|晚上)?\s*(\d{1,2})(?:(?::(\d{1,2}))|点(半|\d{1,2}分)?)?/);
  if (!match) return null;

  let hour = Number(match[2]);
  const minute = match[3] ? Number(match[3]) : match[4] === '半' ? 30 : match[4] ? Number(match[4].replace('分', '')) : 0;
  if ((match[1] === '下午' || match[1] === '晚上') && hour < 12) hour += 12;
  if (match[1] === '上午' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  const start = new Date(now);
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const summary = command
    .replace(/^(帮我|请|给我)\s*/, '')
    .replace(/(?:今天|明天|后天)/g, '')
    .replace(/(?:上午|下午|晚上)?\s*\d{1,2}(?:(?::\d{1,2})|点(?:半|\d{1,2}分)?)?/g, '')
    .replace(/(?:添加到|写入|放到|加入)?(?:我的)?(?:Google)?(?:日历|日程)(?:里|中)?/gi, '')
    .replace(/^(安排|创建|添加)\s*/, '')
    .trim() || 'FurryPal 安排';

  return {
    summary,
    start: start.toISOString(),
    end: end.toISOString(),
    description: `由 FurryPal AI 中枢根据指令创建：${command}`,
  };
}
