/**
 * Minimal in-memory fixed-window rate limiter for login/register/reset
 * endpoints (PLAN.md §9). Deliberately not backed by Redis: this app runs as
 * a single Node process per PLAN.md's Docker setup (one `app` container), so
 * an in-memory Map is sufficient and avoids an extra infrastructure
 * dependency. It resets on deploy/restart — acceptable for abuse-throttling
 * on a small club app, not a security boundary on its own (passwords are
 * still hashed with bcrypt regardless).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this doesn't grow unbounded across a
// long-running process.
const SWEEP_INTERVAL_MS = 10 * 60_000;
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * @param key    Identifies the thing being limited, e.g. `login:${email}` or
 *               `register:${ip}`. Combine action + subject so different
 *               endpoints don't share a budget.
 * @param limit  Max attempts per window.
 * @param windowMs Window length in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true };
}

/** Test-only: clear all buckets between test cases. */
export function _resetRateLimitsForTests() {
  buckets.clear();
}
