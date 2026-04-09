/**
 * Shared rate-limiter singletons for CRUD mutation routes.
 *
 * Using a shared module-level instance means a single Redis connection / in-memory
 * store is reused across all routes rather than creating one per route file.
 */
import { createRateLimiter } from './rate-limiter'

/**
 * 100 state-changing requests per minute per IP.
 * More permissive than the execute limiter (30/min) because users may
 * batch-create collections, requests, and folders in quick succession.
 */
export const mutationLimiter = createRateLimiter({ windowMs: 60_000, max: 100 })
