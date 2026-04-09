import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createRequestRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError, ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { updateRequestBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string } }

/** Resolves collection + workspace and asserts caller is a member. */
async function assertMember(collectionId: string, sessionUserId: string) {
  const col = await createCollectionRepository().findById(collectionId)
  if (!col) throw new NotFoundError('Collection')
  await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, sessionUserId)
  return col
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const req = await createRequestRepository().findById(params.id)
    if (!req) throw new NotFoundError('Request')
    await assertMember(req.collectionId, session.user.id)
    return NextResponse.json({ request: req })
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = updateRequestBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const repo = createRequestRepository()
    const existing = await repo.findById(params.id)
    if (!existing) throw new NotFoundError('Request')
    const col = await assertMember(existing.collectionId, session.user.id)
    const updated = await repo.update(params.id, parsed.data)
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'updated', resourceType: 'request', resourceName: parsed.data.name ?? existing.name, details: `${parsed.data.method ?? existing.method} ${parsed.data.url ?? existing.url}` })
    return NextResponse.json({ request: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createRequestRepository()
    const existing = await repo.findById(params.id)
    if (!existing) throw new NotFoundError('Request')
    const col = await assertMember(existing.collectionId, session.user.id)
    await repo.delete(params.id)
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'deleted', resourceType: 'request', resourceName: existing.name })
    return NextResponse.json({ deleted: true })
  })
}
