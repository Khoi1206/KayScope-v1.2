/**
 * redis/client.ts — Redis singleton
 *
 * Returns a shared ioredis client when REDIS_URL is set.
 * Returns null when Redis is not configured — callers must handle the null case
 * gracefully (e.g. fall back to in-memory implementations).
 *
 * Uses a process-global to survive Next.js HMR in development.
 */

import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | undefined
}

/**
 * Get the shared Redis client, or null if REDIS_URL is not configured.
 * Connection errors are swallowed — the client will surface them to callers
 * via rejected promises, which they should handle with fallback logic.
 */
export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!global._redisClient) {
    global._redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 2_000,
    })
    // Log errors but do not crash — the rate limiter falls back to in-memory.
    global._redisClient.on('error', (err) => {
      console.warn('[redis] Connection error (rate limiter will fall back to in-memory):', err.message)
    })
  }

  return global._redisClient
}
