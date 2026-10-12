import {
  buildGoogleAuthorizationUrl,
  createGoogleCalendarEvent,
  decryptGoogleToken,
  encryptGoogleToken,
  exchangeGoogleAuthorizationCode,
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from './googleCalendar.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

const safeReturnTo = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';

function getUserId(request) {
  return request.headers.get('oai-authenticated-user-id');
}

async function loadGoogleToken(env, userId) {
  const row = await env.DB.prepare(
    'SELECT token_ciphertext FROM google_calendar_tokens WHERE user_id = ?',
  ).bind(userId).first();
  if (!row) return null;
  return decryptGoogleToken(row.token_ciphertext, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

async function saveGoogleToken(env, userId, token) {
  const ciphertext = await encryptGoogleToken(token, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  await env.DB.prepare(`
    INSERT INTO google_calendar_tokens (user_id, token_ciphertext, scope, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      token_ciphertext = excluded.token_ciphertext,
      scope = excluded.scope,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, ciphertext, token.scope || '', token.expiresAt).run();
}

async function getValidGoogleToken(env, userId) {
  let token = await loadGoogleToken(env, userId);
  if (!token) return null;
  if (token.expiresAt <= Date.now() + 60_000) {
    token = await refreshGoogleAccessToken(env, token);
    await saveGoogleToken(env, userId, token);
  }
  return token;
}

async function handleGoogleCalendar(request, env, url) {
  if (!url.pathname.startsWith('/api/connectors/google/')) return null;

  const configured = isGoogleCalendarConfigured(env) && Boolean(env.DB);
  const userId = getUserId(request);

  if (url.pathname === '/api/connectors/google/status' && request.method === 'GET') {
    if (!configured) return json({ configured: false, connected: false });
    if (!userId) return json({ configured: true, connected: false, identityRequired: true });
    const row = await env.DB.prepare(
      'SELECT expires_at FROM google_calendar_tokens WHERE user_id = ?',
    ).bind(userId).first();
    return json({ configured: true, connected: Boolean(row), expiresAt: row?.expires_at || null });
  }

  if (!configured) return json({ error: 'google_calendar_not_configured' }, 503);
  if (!userId) return json({ error: 'sign_in_required' }, 401);

  if (url.pathname === '/api/connectors/google/start' && request.method === 'GET') {
    const state = crypto.randomUUID();
    const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await env.DB.prepare('DELETE FROM google_oauth_states WHERE expires_at < ?').bind(Date.now()).run();
    await env.DB.prepare(
      'INSERT INTO google_oauth_states (state, user_id, return_to, expires_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
    ).bind(state, userId, returnTo, expiresAt).run();
    const redirectUri = `${url.origin}/api/connectors/google/callback`;
    return Response.redirect(buildGoogleAuthorizationUrl(env, { redirectUri, state }), 302);
  }

  if (url.pathname === '/api/connectors/google/callback' && request.method === 'GET') {
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const row = state ? await env.DB.prepare(
      'SELECT state, user_id, return_to, expires_at FROM google_oauth_states WHERE state = ?',
    ).bind(state).first() : null;
    if (!row || row.user_id !== userId || row.expires_at < Date.now() || !code) {
      return Response.redirect(`${url.origin}/?calendar=invalid_state`, 302);
    }
    await env.DB.prepare('DELETE FROM google_oauth_states WHERE state = ?').bind(state).run();
    try {
      const redirectUri = `${url.origin}/api/connectors/google/callback`;
      const newToken = await exchangeGoogleAuthorizationCode(env, { code, redirectUri });
      const previousToken = await loadGoogleToken(env, userId).catch(() => null);
      if (!newToken.refreshToken && previousToken?.refreshToken) newToken.refreshToken = previousToken.refreshToken;
      await saveGoogleToken(env, userId, newToken);
      const returnTo = safeReturnTo(row.return_to);
      const separator = returnTo.includes('?') ? '&' : '?';
      return Response.redirect(`${url.origin}${returnTo}${separator}calendar=connected`, 302);
    } catch {
      return Response.redirect(`${url.origin}/?calendar=error`, 302);
    }
  }

  if (url.pathname === '/api/connectors/google/events' && request.method === 'GET') {
    const token = await getValidGoogleToken(env, userId);
    if (!token) return json({ error: 'google_calendar_not_connected' }, 401);
    try {
      return json({ events: await listGoogleCalendarEvents(token.accessToken, 5) });
    } catch (error) {
      return json({ error: 'google_calendar_api_error', message: error.message }, 502);
    }
  }

  if (url.pathname === '/api/connectors/google/events' && request.method === 'POST') {
    const token = await getValidGoogleToken(env, userId);
    if (!token) return json({ error: 'google_calendar_not_connected' }, 401);
    const body = await request.json();
    if (!body.summary || !body.start || !body.end) return json({ error: 'invalid_calendar_event' }, 400);
    try {
      return json({ event: await createGoogleCalendarEvent(token.accessToken, body) }, 201);
    } catch (error) {
      return json({ error: 'google_calendar_api_error', message: error.message }, 502);
    }
  }

  if (url.pathname === '/api/connectors/google/disconnect' && request.method === 'POST') {
    const token = await loadGoogleToken(env, userId).catch(() => null);
    await revokeGoogleToken(token?.refreshToken || token?.accessToken).catch(() => undefined);
    await env.DB.prepare('DELETE FROM google_calendar_tokens WHERE user_id = ?').bind(userId).run();
    return json({ connected: false });
  }

  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const googleCalendarResponse = await handleGoogleCalendar(request, env, url);
    if (googleCalendarResponse) return googleCalendarResponse;
    const galleryMatch = url.pathname.match(/^\/gallery\/([a-f0-9]{64}\.webp)$/);

    if (galleryMatch && request.method === "GET") {
      const object = await env.PET_IMAGES.get(`gallery/${galleryMatch[1]}`);
      if (!object) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "private, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }

    const response = await env.ASSETS.fetch(request);

    if (
      response.status !== 404 ||
      request.method !== "GET" ||
      !request.headers.get("accept")?.includes("text/html")
    ) {
      return response;
    }

    const indexUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
