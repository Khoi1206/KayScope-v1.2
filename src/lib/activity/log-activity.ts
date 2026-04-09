import { createActivityRepository } from '@/lib/db/repository-factory'
import type { ActivityAction, ActivityResourceType } from '@/modules/activity/domain/entities/activity.entity'
import logger from '@/lib/logger'

/**
 * Fire-and-forget activity logger. Call from API route handlers after mutations.
 * Failures are swallowed so they never break the primary operation.
 */
export async function logActivity(opts: {
  workspaceId: string
  userId: string
  userName: string
  action: ActivityAction
  resourceType: ActivityResourceType
  resourceName: string
  details?: string
}): Promise<void> {
  try {
    const repo = createActivityRepository()
    await repo.create(opts)
  } catch (err) {
    logger.error({ err }, '[logActivity] Failed to persist activity log')
  }
}
