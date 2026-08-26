/**
 * rateLimiter.ts — Simple in-memory rate limiter for sensitive endpoints.
 *
 * Uses a sliding-window counter stored in a Map. Entries are pruned lazily
 * when the window expires, so memory stays bounded even under sustained load.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 3 });
 *   if (!limiter.check(key)) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms when the window resets
}

interface RateLimiterOptions {
  /** Length of the sliding window in milliseconds (default: 15 minutes) */
  windowMs?: number;
  /** Maximum number of requests allowed within the window (default: 3) */
  max?: number;
}

export interface RateLimiter {
  /**
   * Checks whether the given key is within the rate limit.
   * Increments the counter and returns `true` if allowed, `false` if blocked.
   */
  check(key: string): boolean;
  /** Returns how many seconds until the window resets for a key (0 if not limited). */
  retryAfterSeconds(key: string): number;
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes
  const max = options.max ?? 3;
  const store = new Map<string, RateLimitEntry>();

  function prune() {
    const now = Date.now();
    Array.from(store.entries()).forEach(([key, entry]) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }

  return {
    check(key: string): boolean {
      prune();
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        // New window
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= max) {
        return false; // blocked
      }

      entry.count += 1;
      return true;
    },

    retryAfterSeconds(key: string): number {
      const entry = store.get(key);
      if (!entry) return 0;
      const remaining = Math.ceil((entry.resetAt - Date.now()) / 1000);
      return Math.max(0, remaining);
    },
  };
}

// ─── Shared limiters ──────────────────────────────────────────────────────────

/** Per-IP limiter: max 5 forgot-password requests per 15 minutes from the same IP */
export const forgotPasswordIpLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

/** Per-email limiter: max 3 forgot-password requests per 15 minutes for the same email */
export const forgotPasswordEmailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 3 });
