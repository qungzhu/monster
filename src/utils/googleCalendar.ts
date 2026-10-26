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
