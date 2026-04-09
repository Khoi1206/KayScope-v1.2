import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { NotFoundError } from '@/lib/errors/ValidationError'
import { UnauthorizedError } from '@/lib/errors/AuthError'
import { ValidationError } from '@/lib/errors/ValidationError'
import { createWorkspaceRepository, createUserRepository } from '@/lib/db/repository-factory'
import { logActivity } from '@/lib/activity/log-activity'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string; userId: string } }

/** DELETE /api/workspaces/[id]/members/[userId] — remove a member */
export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const wsRepo = createWorkspaceRepository()
    const ws = await wsRepo.findById(params.id)
    if (!ws) throw new NotFoundError('Workspace')
    if (ws.ownerId !== session.user.id) throw new UnauthorizedError('Only the owner can remove members')
    if (params.userId === ws.ownerId) throw new ValidationError('Cannot remove the owner')
    if (!ws.members.some(m => m.userId === params.userId)) throw new NotFoundError('Member')

    const userRepo = createUserRepository()
    const removedUser = await userRepo.findById(params.userId)
    const updated = await wsRepo.removeMember(params.id, params.userId)
    logActivity({ workspaceId: params.id, userId: session.user.id, userName: session.user.name ?? 'User', action: 'removed', resourceType: 'member', resourceName: removedUser?.name ?? params.userId })
    return NextResponse.json({ workspace: updated })
  })
}
