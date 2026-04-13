import type { IActivityRepository } from '../repositories/activity.repository'
import type { ActivityLog } from '../entities/activity.entity'

export class GetActivityCursorUseCase {
  constructor(private readonly activityRepo: IActivityRepository) {}

  async execute(
    workspaceId: string,
    limit: number,
    afterId?: string,
  ): Promise<{ items: ActivityLog[], nextCursor: string | null }> {
    return this.activityRepo.findByWorkspaceCursor(workspaceId, limit, afterId)
  }
}
