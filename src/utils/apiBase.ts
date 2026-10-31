/**
 * Where the Express API lives. Empty on the web: same origin (Vite proxies
 * /api to the server in dev). The native (Capacitor) build serves the UI
 * from the device, so it sets VITE_API_BASE to the deployed server.
 */
export const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

/** Absolute URL for an API path such as '/api/chat'. */
export const apiUrl = (path: string) => `${API_BASE}${path}`;
