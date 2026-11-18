// Guards for the API server: who may call it (CORS + optional app token)
// and how often (per-IP rate limits). Without these anyone who finds the
// URL can spend the server's OpenAI / Meshy credit.
//
// Env:
//   ALLOWED_ORIGINS  comma-separated browser origins allowed by CORS,
//                    e.g. "https://furrypal.app,capacitor://localhost".
//                    Unset = any origin (local development).
//   APP_TOKEN        when set, the paid endpoints (AI + Meshy) require an
//                    `X-App-Token` header with this value; builds send it
//                    from VITE_APP_TOKEN. It ships inside the app, so treat
//                    it as a speed bump against casual abuse, not a secret —
//                    the rate limits are what cap the spend.

import { timingSafeEqual } from 'node:crypto';

export function corsOptions(env = process.env) {
  const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.length) return {};
  return {
    origin(origin, cb) {
      // No Origin header: same-origin, curl, native HTTP — CORS doesn't apply.
      cb(null, !origin || allowed.includes(origin));
    },
  };
}

const sameToken = (a, b) => {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function requireAppToken(env = process.env) {
  return (req, res, next) => {
    const token = env.APP_TOKEN;
    if (!token || sameToken(req.headers['x-app-token'], token)) return next();
    res.status(401).json({ error: 'unauthorized' });
  };
}

/**
 * Fixed-window rate limiter keyed by client IP. In memory, so it's per
 * process — fine for a single server; put a shared store in front if you
 * run several.
 */
export function rateLimit({ windowMs, max, now = () => Date.now() }) {
  const hits = new Map();
  let sweptAt = now();
  return (req, res, next) => {
    const t = now();
    if (t - sweptAt > windowMs) {
      for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
      sweptAt = t;
    }
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(key);
    if (!entry || t - entry.start >= windowMs) {
      entry = { start: t, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - t) / 1000)));
      return res.status(429).json({ error: 'rate_limited' });
    }
    next();
  };
}

/** Meshy model downloads: only https URLs on Meshy's own hosts. */
export function isMeshyAssetUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' && (u.hostname === 'meshy.ai' || u.hostname.endsWith('.meshy.ai'));
  } catch {
    return false;
  }
}
