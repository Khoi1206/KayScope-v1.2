/**
 * WorkspaceMembershipService — SRP
 *
 * Centralises membership-checking and resource-ownership logic that was previously
 * copy-pasted across every API route.
 *
 * Depends on IWorkspaceFinder (only findById) rather than the full
 * IWorkspaceRepository — the service only reads workspaces, so it should not
 * be coupled to write operations it never uses (ISP).
 */
import type { Workspace } from '@/modules/workspace/domain/entities/workspace.entity'
import type { IWorkspaceFinder } from '@/modules/workspace/domain/repositories/workspace.repository'
import { NotFoundError } from '@/lib/errors/ValidationError'
import { UnauthorizedError } from '@/lib/errors/AuthError'

export class WorkspaceMembershipService {
  constructor(private readonly workspaceRepo: IWorkspaceFinder) {}

  /**
   * Fetches the workspace, asserts the user is a member or owner, and
   * returns the workspace so callers that need it avoid a second DB round-trip.
   */
  async findAndAssert(workspaceId: string, userId: string): Promise<Workspace> {
    const ws = await this.workspaceRepo.findById(workspaceId)
    if (!ws) throw new NotFoundError('Workspace')
    if (ws.ownerId !== userId && !ws.members.some(m => m.userId === userId)) {
      throw new UnauthorizedError('Access denied')
    }
    return ws
  }

  /** Checks membership only — convenience wrapper when the workspace is not needed. */
  async assertMembership(workspaceId: string, userId: string): Promise<void> {
    await this.findAndAssert(workspaceId, userId)
  }

  /**
   * Asserts that the user is either the resource creator OR the workspace owner.
   *
   * This is the standard authorization rule for mutable operations (rename, delete)
   * on collections, environments, and similar resources. Eliminates the duplicated
   * inline check that was previously spread across multiple route handlers (SRP).
   *
   * @param createdBy  - The userId of the resource's original creator.
   * @param workspaceId - The workspace the resource belongs to.
   * @param userId     - The current user.
   */
  async assertCreatorOrOwner(createdBy: string, workspaceId: string, userId: string): Promise<void> {
    if (createdBy === userId) return
    const ws = await this.workspaceRepo.findById(workspaceId)
    if (!ws || ws.ownerId !== userId) throw new UnauthorizedError('Forbidden')
  }
}
