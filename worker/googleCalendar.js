const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getEncryptionKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function isGoogleCalendarConfigured(env) {
  return Boolean(
    env.GOOGLE_CLIENT_ID
      && env.GOOGLE_CLIENT_SECRET
      && env.GOOGLE_TOKEN_ENCRYPTION_KEY?.length >= 32,
  );
}

export function buildGoogleAuthorizationUrl(env, { redirectUri, state }) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

async function tokenRequest(env, body) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token request failed');
  return data;
}

export async function exchangeGoogleAuthorizationCode(env, { code, redirectUri }) {
  const data = await tokenRequest(env, {
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    scope: data.scope || GOOGLE_SCOPE,
  };
}

export async function refreshGoogleAccessToken(env, token) {
  if (!token.refreshToken) throw new Error('Google refresh token is missing');
  const data = await tokenRequest(env, {
    refresh_token: token.refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  return {
    ...token,
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    scope: data.scope || token.scope,
  };
}

export async function encryptGoogleToken(token, secret) {
  const key = await getEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(token));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptGoogleToken(value, secret) {
  const [ivValue, ciphertextValue] = value.split('.');
  if (!ivValue || !ciphertextValue) throw new Error('Invalid encrypted token');
  const key = await getEncryptionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivValue) },
    key,
    fromBase64Url(ciphertextValue),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function calendarRequest(path, accessToken, init = {}) {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar request failed');
  return data;
}

export async function listGoogleCalendarEvents(accessToken, maxResults = 5) {
  const query = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const data = await calendarRequest(`/calendars/primary/events?${query}`, accessToken);
  return (data.items || []).map(event => ({
    id: event.id,
    summary: event.summary || '未命名日程',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    htmlLink: event.htmlLink || null,
  }));
}

export async function createGoogleCalendarEvent(accessToken, event) {
  const data = await calendarRequest('/calendars/primary/events', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      summary: event.summary,
      description: event.description || '由 FurryPal AI 中枢创建',
      start: { dateTime: event.start },
      end: { dateTime: event.end },
    }),
  });
  return {
    id: data.id,
    summary: data.summary,
    start: data.start?.dateTime || null,
    end: data.end?.dateTime || null,
    htmlLink: data.htmlLink || null,
  };
}

export async function revokeGoogleToken(token) {
  if (!token) return;
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
}
