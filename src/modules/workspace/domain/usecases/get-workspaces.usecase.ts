import { IWorkspaceRepository } from '../repositories/workspace.repository'
import { Workspace } from '../entities/workspace.entity'

export class GetWorkspacesUseCase {
  constructor(private readonly workspaceRepo: IWorkspaceRepository) {}

  /** Returns all workspaces the user owns or is a member of, deduplicated. */
  async execute(userId: string): Promise<Workspace[]> {
    const [owned, memberOf] = await Promise.all([
      this.workspaceRepo.findByOwner(userId),
      this.workspaceRepo.findByMember(userId),
    ])
    const seen = new Set<string>()
    const all: Workspace[] = []
    for (const ws of [...owned, ...memberOf]) {
      if (!seen.has(ws.id)) {
        seen.add(ws.id)
        all.push(ws)
      }
    }
    return all
  }
}
