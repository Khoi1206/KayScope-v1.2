export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'executed'
  | 'invited'
  | 'removed'
  | 'imported'
  | 'exported'

export type ActivityResourceType =
  | 'workspace'
  | 'collection'
  | 'folder'
  | 'request'
  | 'environment'
  | 'member'

export interface ActivityLog {
  id: string
  workspaceId: string
  userId: string
  userName: string
  action: ActivityAction
  resourceType: ActivityResourceType
  resourceName: string
  details?: string
  createdAt: Date
}

export interface CreateActivityLogDTO {
  workspaceId: string
  userId: string
  userName: string
  action: ActivityAction
  resourceType: ActivityResourceType
  resourceName: string
  details?: string
}
