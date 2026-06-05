// Best-effort fixed-window rate limiter.
//
// NOTE: state lives in-process, so on a multi-instance / serverless deployment
// (Vercel) it limits *per warm instance*, not globally. It's a cheap first layer
// that blunts rapid bursts from a single client — not a hard guarantee. For
// strict, cross-instance limits, back this with a shared store (e.g. Upstash
// Redis). Limits are intentionally generous so normal use never trips.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when !ok). */
  retryAfter: number;
}

export function rateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    // Opportunistically prune expired buckets so the map can't grow unbounded.
    if (buckets.size > 5_000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }

  b.count += 1;
  return { ok: true, retryAfter: 0 };
}
