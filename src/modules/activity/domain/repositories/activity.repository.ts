import type { ActivityLog, CreateActivityLogDTO } from '../entities/activity.entity'

export interface IActivityRepository {
  create(dto: CreateActivityLogDTO): Promise<ActivityLog>
  findByWorkspace(workspaceId: string, limit?: number, skip?: number): Promise<ActivityLog[]>
  findByWorkspaceSince(workspaceId: string, since: Date): Promise<ActivityLog[]>
  countByWorkspace(workspaceId: string): Promise<number>
  deleteByWorkspace(workspaceId: string): Promise<void>
}
