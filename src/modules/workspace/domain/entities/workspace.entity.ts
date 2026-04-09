// ─── Workspace Entity ─────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'editor' | 'viewer'

export interface WorkspaceMember {
  userId: string
  role: WorkspaceRole
  joinedAt: Date
}

export interface Workspace {
  id: string
  name: string
  description?: string
  ownerId: string
  members: WorkspaceMember[]
  createdAt: Date
  updatedAt: Date
}

// DTOs
export interface CreateWorkspaceDTO {
  name: string
  description?: string
  ownerId: string
}

export interface UpdateWorkspaceDTO {
  name?: string
  description?: string
}

export interface AddMemberDTO {
  workspaceId: string
  userId: string
  role: WorkspaceRole
}
