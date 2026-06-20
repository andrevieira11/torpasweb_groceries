import "server-only";

/**
 * In-memory fixed-window rate limiter. We self-host a single instance, so a
 * process-local map is enough (it resets on restart — acceptable for abuse
 * throttling on guest writes and the ingest webhook). Not a security boundary
 * on its own; token checks are.
 */
type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const w = windows.get(key);

  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 5000) pruneExpired(now);
    return { ok: true, retryAfterMs: 0 };
  }
  if (w.count >= limit) {
    return { ok: false, retryAfterMs: w.resetAt - now };
  }
  w.count++;
  return { ok: true, retryAfterMs: 0 };
}

function pruneExpired(now: number) {
  for (const [key, w] of windows) {
    if (now >= w.resetAt) windows.delete(key);
  }
}
