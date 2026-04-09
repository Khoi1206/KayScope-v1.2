/**
 * Sliding-window rate limiter for Next.js API routes.
 *
 * Strategy (chosen at module init time):
 *   1. Redis (SORTED SET + Lua script) — when REDIS_URL is set.
 *      Atomic, survives restarts, works in multi-instance deployments.
 *   2. In-memory fallback — when Redis is unavailable or not configured.
 *      Suitable for single-instance / development use only.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })
 *   if (!await limiter.check(ip)) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 */

import { getRedis } from '@/lib/redis/client'

export interface RateLimiterOptions {
  /** Rolling window in milliseconds */
  windowMs: number
  /** Max requests allowed within the window */
  max: number
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if it should be rejected. */
  check(key: string): Promise<boolean>
}

// ── Redis implementation ──────────────────────────────────────────────────────

/**
 * Atomic Lua script: adds the current timestamp, removes expired entries, and
 * checks the count — all in a single round-trip with no race conditions.
 *
 * KEYS[1] = bucket key
 * ARGV[1] = current time (ms)
 * ARGV[2] = window start  (ms)
 * ARGV[3] = max requests
 * ARGV[4] = window TTL    (ms)
 *
 * Returns 1 (allowed) or 0 (rate-limited).
 */
const SLIDING_WINDOW_SCRIPT = `
local key        = KEYS[1]
local now        = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local max        = tonumber(ARGV[3])
local ttlMs      = tonumber(ARGV[4])

redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
local count = redis.call('ZCARD', key)

if count >= max then
  return 0
end

redis.call('ZADD', key, now, now .. '-' .. redis.call('INCR', key .. ':seq'))
redis.call('PEXPIRE', key, ttlMs)
return 1
`

function createRedisRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const redis = getRedis()!

  return {
    async check(key: string): Promise<boolean> {
      const now = Date.now()
      const windowStart = now - opts.windowMs
      try {
        const result = await redis.eval(
          SLIDING_WINDOW_SCRIPT,
          1,
          `rl:${key}`,
          String(now),
          String(windowStart),
          String(opts.max),
          String(opts.windowMs + 1_000), // TTL slightly longer than window
        ) as number
        return result === 1
      } catch {
        // Redis error — fail open (allow the request) to avoid self-DoS.
        return true
      }
    },
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────────

function createMemoryRateLimiter(opts: RateLimiterOptions): RateLimiter {
  // Map<key, sorted array of timestamps (ms)>
  const store = new Map<string, number[]>()

  return {
    async check(key: string): Promise<boolean> {
      const now = Date.now()
      const windowStart = now - opts.windowMs
      const timestamps = (store.get(key) ?? []).filter(t => t > windowStart)

      if (timestamps.length >= opts.max) {
        store.set(key, timestamps)
        return false
      }

      timestamps.push(now)
      store.set(key, timestamps)

      // Prune stale keys to prevent unbounded growth under unique-IP floods.
      // Only runs when threshold is crossed to avoid O(n) on every check.
      if (store.size > 10_000) {
        const evictBefore = now - opts.windowMs
        store.forEach((ts, k) => {
          if (ts.length === 0 || ts[ts.length - 1] < evictBefore) store.delete(k)
        })
      }

      return true
    },
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns a Redis-backed limiter when REDIS_URL is set, otherwise an in-memory
 * sliding-window limiter. The choice is made once at call time.
 */
export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const redis = getRedis()
  if (redis) return createRedisRateLimiter(opts)
  return createMemoryRateLimiter(opts)
}
