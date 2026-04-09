import { IActivityRepository } from '../repositories/activity.repository'
import { ActivityLog } from '../entities/activity.entity'

export class GetActivityUseCase {
  constructor(private readonly activityRepo: IActivityRepository) {}

  async execute(
    workspaceId: string,
    limit: number,
    skip: number,
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const [logs, total] = await Promise.all([
      this.activityRepo.findByWorkspace(workspaceId, limit, skip),
      this.activityRepo.countByWorkspace(workspaceId),
    ])
    return { logs, total }
  }
}
