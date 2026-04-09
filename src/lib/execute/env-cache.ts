/**
 * env-cache.ts — Redis read-through cache for decrypted environment variables.
 *
 * Caches the full Environment entity (with decrypted secrets) server-side only.
 * TTL: 5 minutes. Invalidated on environment update/delete.
 */

import { getRedis } from '@/lib/redis/client'
import { createEnvironmentRepository } from '@/lib/db/repository-factory'
import type { Environment } from '@/modules/environment/domain/entities/environment.entity'

const CACHE_TTL_SECONDS = 300 // 5 minutes

function cacheKey(envId: string) {
  return `env:${envId}`
}

/**
 * Fetch an environment by ID, using Redis as a read-through cache.
 * Decrypted secret values are cached server-side only — never sent to the client.
 */
export async function getCachedEnvironment(envId: string): Promise<Environment | null> {
  const redis = getRedis()

  if (redis) {
    try {
      const cached = await redis.get(cacheKey(envId))
      if (cached) {
        const env = JSON.parse(cached) as Environment
        env.createdAt = new Date(env.createdAt)
        env.updatedAt = new Date(env.updatedAt)
        return env
      }
    } catch {
      // Cache miss or error — fall through to DB
    }
  }

  const env = await createEnvironmentRepository().findById(envId)

  if (env && redis) {
    try {
      await redis.set(cacheKey(envId), JSON.stringify(env), 'EX', CACHE_TTL_SECONDS)
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return env
}

/**
 * Invalidate the Redis cache for an environment.
 * Call after updating or deleting an environment.
 */
export async function invalidateEnvCache(envId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(cacheKey(envId))
  } catch {
    // Non-fatal
  }
}
