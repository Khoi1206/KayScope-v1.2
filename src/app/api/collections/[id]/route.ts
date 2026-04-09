import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import clientPromise, { getDatabase } from '@/lib/db/mongodb'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError, ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { updateCollectionBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const repo = createCollectionRepository()
    const col = await repo.findById(params.id)
    if (!col) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, session.user.id)
    return NextResponse.json({ collection: col })
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createCollectionRepository()
    const col = await repo.findById(params.id)
    if (!col) throw new NotFoundError('Collection')
    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
    await membershipService.assertCreatorOrOwner(col.createdBy, col.workspaceId, session.user.id)
    const body = await req.json()
    const parsed = updateCollectionBodySchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const updated = await repo.update(params.id, parsed.data)
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'updated', resourceType: 'collection', resourceName: parsed.data.name ?? col.name })
    return NextResponse.json({ collection: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createCollectionRepository()
    const col = await repo.findById(params.id)
    if (!col) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertCreatorOrOwner(col.createdBy, col.workspaceId, session.user.id)
    // Cascade delete: requests → folders → collection — all-or-nothing
    const client = await clientPromise
    const txSession = client.startSession()
    try {
      await txSession.withTransaction(async () => {
        const db = await getDatabase()
        const colOid = new ObjectId(params.id)
        await Promise.all([
          db.collection('requests').deleteMany({ collectionId: colOid }, { session: txSession }),
          db.collection('folders').deleteMany({ collectionId: colOid }, { session: txSession }),
        ])
        await db.collection('collections').deleteOne({ _id: colOid }, { session: txSession })
      })
    } finally {
      await txSession.endSession()
    }
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'deleted', resourceType: 'collection', resourceName: col.name })
    return NextResponse.json({ deleted: true })
  })
}
