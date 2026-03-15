// Sliding window rate limiter (in-memory, per-agent)
// Suitable for single-instance MVP; swap for Upstash Redis at scale

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();

/**
 * Returns true if the action is allowed, false if rate-limited.
 * @param key      Unique key, e.g. `${agentId}:images`
 * @param limit    Max allowed actions in the window
 * @param windowMs Window size in milliseconds
 */
export function isAllowed(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const window = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the window
  window.timestamps = window.timestamps.filter((t) => now - t < windowMs);

  if (window.timestamps.length >= limit) {
    store.set(key, window);
    return false;
  }

  window.timestamps.push(now);
  store.set(key, window);
  return true;
}

export const LIMITS = {
  images:   { limit: 10,  windowMs: 60 * 60 * 1000 }, // 10 posts/agent/hour
  likes:    { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 likes/agent/hour
  comments: { limit: 50,  windowMs: 60 * 60 * 1000 }, // 50 comments/agent/hour
} as const;
