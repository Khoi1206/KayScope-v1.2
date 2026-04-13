import type { ActivityLog, CreateActivityLogDTO } from '../entities/activity.entity'

export interface IActivityRepository {
  create(dto: CreateActivityLogDTO): Promise<ActivityLog>
  findByWorkspace(workspaceId: string, limit?: number, skip?: number): Promise<ActivityLog[]>
  findByWorkspaceCursor(workspaceId: string, limit?: number, afterId?: string): Promise<{ items: ActivityLog[], nextCursor: string | null }>
  findByWorkspaceSince(workspaceId: string, since: Date): Promise<ActivityLog[]>
  countByWorkspace(workspaceId: string): Promise<number>
  deleteByWorkspace(workspaceId: string): Promise<void>
}
