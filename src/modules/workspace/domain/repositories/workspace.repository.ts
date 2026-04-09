import { Workspace, CreateWorkspaceDTO, UpdateWorkspaceDTO } from '../entities/workspace.entity'

/**
 * Narrow interface used by services that only need to look up a workspace by ID.
 * Prefer injecting this over IWorkspaceRepository when only findById is needed (ISP).
 */
export interface IWorkspaceFinder {
  findById(id: string): Promise<Workspace | null>
}

export interface IWorkspaceRepository extends IWorkspaceFinder {
  findByOwner(ownerId: string): Promise<Workspace[]>
  findByMember(userId: string): Promise<Workspace[]>
  create(dto: CreateWorkspaceDTO): Promise<Workspace>
  update(id: string, dto: UpdateWorkspaceDTO): Promise<Workspace | null>
  addMember(workspaceId: string, userId: string, role: string): Promise<Workspace | null>
  removeMember(workspaceId: string, userId: string): Promise<Workspace | null>
  delete(id: string): Promise<boolean>
}
