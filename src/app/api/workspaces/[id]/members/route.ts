import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { UnauthorizedError } from '@/lib/errors/AuthError'
import { createWorkspaceRepository, createUserRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { logActivity } from '@/lib/activity/log-activity'
import type { WorkspaceRole } from '@/modules/workspace/domain/entities/workspace.entity'
import { inviteMemberBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string } }

/** GET /api/workspaces/[id]/members — list all members enriched with user info */
export async function GET(_req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const wsRepo = createWorkspaceRepository()
    const ws = await new WorkspaceMembershipService(wsRepo).findAndAssert(params.id, session.user.id)
    const userRepo = createUserRepository()

    // Enrich owner + members with name/email — single batch query (avoids N+1)
    const allUserIds = [ws.ownerId, ...ws.members.map(m => m.userId)]
    const userList = await userRepo.findByIds(allUserIds)

    const userMap: Record<string, { name: string; email: string }> = {}
    for (const u of userList) {
      userMap[u.id] = { name: u.name, email: u.email }
    }

    const ownerInfo = userMap[ws.ownerId]
    const members = [
      {
        userId: ws.ownerId,
        role: 'owner' as WorkspaceRole,
        name: ownerInfo?.name ?? 'Unknown',
        email: ownerInfo?.email ?? '',
        joinedAt: ws.createdAt,
      },
      ...ws.members.map(m => ({
        userId: m.userId,
        role: m.role,
        name: userMap[m.userId]?.name ?? 'Unknown',
        email: userMap[m.userId]?.email ?? '',
        joinedAt: m.joinedAt,
      })),
    ]

    return NextResponse.json({ members, isOwner: ws.ownerId === session.user.id })
  })
}

/** POST /api/workspaces/[id]/members — invite a user by email */
export async function POST(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const wsRepo = createWorkspaceRepository()
    const ws = await wsRepo.findById(params.id)
    if (!ws) throw new NotFoundError('Workspace')
    if (ws.ownerId !== session.user.id) throw new UnauthorizedError('Only the owner can invite members')

    const raw = await req.json()
    const bodyParsed = inviteMemberBodySchema.safeParse(raw)
    if (!bodyParsed.success) throw new ValidationError(bodyParsed.error.issues[0].message)
    const email = bodyParsed.data.email.toLowerCase()
    const role: WorkspaceRole = bodyParsed.data.role

    const userRepo = createUserRepository()
    const invitee = await userRepo.findByEmail(email)
    if (!invitee) throw new ValidationError('No account found for that email address')
    if (invitee.id === session.user.id) throw new ValidationError('You cannot invite yourself')
    if (ws.ownerId === invitee.id) throw new ValidationError('User is already the owner')
    if (ws.members.some(m => m.userId === invitee.id)) throw new ValidationError('User is already a member')

    const updated = await wsRepo.addMember(params.id, invitee.id, role)
    logActivity({ workspaceId: params.id, userId: session.user.id, userName: session.user.name ?? 'User', action: 'invited', resourceType: 'member', resourceName: invitee.name, details: `as ${role}` })
    return NextResponse.json({ workspace: updated }, { status: 201 })
  })
}
