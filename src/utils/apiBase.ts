/**
 * Where the Express API lives. Empty on the web: same origin (Vite proxies
 * /api to the server in dev). The native (Capacitor) build serves the UI
 * from the device, so it sets VITE_API_BASE to the deployed server.
 */
export const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

/** Absolute URL for an API path such as '/api/chat'. */
export const apiUrl = (path: string) => `${API_BASE}${path}`;

/**
 * Headers for the server's paid endpoints. VITE_APP_TOKEN must match the
 * server's APP_TOKEN when that is set (see server/guard.js).
 */
export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = import.meta.env.VITE_APP_TOKEN as string | undefined;
  return { ...(token ? { 'X-App-Token': token } : {}), ...extra };
}
