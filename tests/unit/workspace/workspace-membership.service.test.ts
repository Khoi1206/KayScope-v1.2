import { describe, it, expect, vi } from 'vitest'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError } from '@/lib/errors/ValidationError'
import { UnauthorizedError } from '@/lib/errors/AuthError'
import type { IWorkspaceFinder } from '@/modules/workspace/domain/repositories/workspace.repository'
import type { Workspace } from '@/modules/workspace/domain/entities/workspace.entity'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const OWNER_ID = 'owner-001'
const MEMBER_ID = 'member-002'
const STRANGER_ID = 'stranger-003'
const WORKSPACE_ID = 'ws-001'

const mockWorkspace: Workspace = {
  id: WORKSPACE_ID,
  name: 'Test Workspace',
  ownerId: OWNER_ID,
  members: [{ userId: MEMBER_ID, role: 'editor', joinedAt: new Date() }],
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeRepo(ws: Workspace | null): IWorkspaceFinder {
  return { findById: vi.fn().mockResolvedValue(ws) }
}

// ── findAndAssert ─────────────────────────────────────────────────────────────

describe('WorkspaceMembershipService.findAndAssert()', () => {
  it('returns the workspace when called by the owner', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    const result = await service.findAndAssert(WORKSPACE_ID, OWNER_ID)
    expect(result).toBe(mockWorkspace)
  })

  it('returns the workspace when called by a member', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    const result = await service.findAndAssert(WORKSPACE_ID, MEMBER_ID)
    expect(result).toBe(mockWorkspace)
  })

  it('throws NotFoundError when workspace does not exist', async () => {
    const service = new WorkspaceMembershipService(makeRepo(null))
    await expect(service.findAndAssert(WORKSPACE_ID, OWNER_ID)).rejects.toThrow(NotFoundError)
  })

  it('throws UnauthorizedError for a non-member stranger', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    await expect(service.findAndAssert(WORKSPACE_ID, STRANGER_ID)).rejects.toThrow(UnauthorizedError)
  })
})

// ── assertMembership ──────────────────────────────────────────────────────────

describe('WorkspaceMembershipService.assertMembership()', () => {
  it('resolves without throwing for an owner', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    await expect(service.assertMembership(WORKSPACE_ID, OWNER_ID)).resolves.toBeUndefined()
  })

  it('resolves without throwing for a member', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    await expect(service.assertMembership(WORKSPACE_ID, MEMBER_ID)).resolves.toBeUndefined()
  })

  it('throws UnauthorizedError for a stranger', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    await expect(service.assertMembership(WORKSPACE_ID, STRANGER_ID)).rejects.toThrow(UnauthorizedError)
  })

  it('throws NotFoundError when workspace is not found', async () => {
    const service = new WorkspaceMembershipService(makeRepo(null))
    await expect(service.assertMembership(WORKSPACE_ID, OWNER_ID)).rejects.toThrow(NotFoundError)
  })
})

// ── assertCreatorOrOwner ──────────────────────────────────────────────────────

describe('WorkspaceMembershipService.assertCreatorOrOwner()', () => {
  it('resolves immediately when the user is the resource creator (no DB call)', async () => {
    const repo = makeRepo(mockWorkspace)
    const service = new WorkspaceMembershipService(repo)
    // Creator is the same as the user — should not call findById
    await expect(service.assertCreatorOrOwner(MEMBER_ID, WORKSPACE_ID, MEMBER_ID)).resolves.toBeUndefined()
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('resolves when the user is the workspace owner but not the creator', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    // createdBy = MEMBER_ID, but userId = OWNER_ID (the workspace owner)
    await expect(service.assertCreatorOrOwner(MEMBER_ID, WORKSPACE_ID, OWNER_ID)).resolves.toBeUndefined()
  })

  it('throws UnauthorizedError when user is neither creator nor owner', async () => {
    const service = new WorkspaceMembershipService(makeRepo(mockWorkspace))
    // createdBy = OWNER_ID, userId = MEMBER_ID (not the owner)
    await expect(service.assertCreatorOrOwner(OWNER_ID, WORKSPACE_ID, MEMBER_ID)).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when workspace cannot be found', async () => {
    const service = new WorkspaceMembershipService(makeRepo(null))
    await expect(service.assertCreatorOrOwner(MEMBER_ID, WORKSPACE_ID, OWNER_ID)).rejects.toThrow(UnauthorizedError)
  })
})
