import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createWorkspaceRepository } from '@/lib/db/repository-factory'
import clientPromise, { getDatabase } from '@/lib/db/mongodb'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError, ValidationError } from '@/lib/errors/ValidationError'
import { UnauthorizedError } from '@/lib/errors/AuthError'
import { logActivity } from '@/lib/activity/log-activity'
import { updateWorkspaceBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const ws = await new WorkspaceMembershipService(createWorkspaceRepository()).findAndAssert(params.id, session.user.id)
    return NextResponse.json({ workspace: ws })
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createWorkspaceRepository()
    const ws = await repo.findById(params.id)
    if (!ws) throw new NotFoundError('Workspace')
    if (ws.ownerId !== session.user.id) throw new UnauthorizedError('Only the owner can update this workspace')
    const raw = await req.json()
    const parsed = updateWorkspaceBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const updated = await repo.update(params.id, parsed.data)
    logActivity({ workspaceId: params.id, userId: session.user.id, userName: session.user.name ?? 'User', action: 'updated', resourceType: 'workspace', resourceName: parsed.data.name ?? ws.name })
    return NextResponse.json({ workspace: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createWorkspaceRepository()
    const ws = await repo.findById(params.id)
    if (!ws) throw new NotFoundError('Workspace')
    if (ws.ownerId !== session.user.id) throw new UnauthorizedError('Only the owner can delete this workspace')

    const workspaceOid = new ObjectId(params.id)

    // Transactional cascade delete — all-or-nothing.
    // ID-fetches happen INSIDE the transaction so concurrent creates are included.
    // Requires a MongoDB replica set (or Atlas/localhost replica set).
    const client = await clientPromise
    const session_db = client.startSession()
    try {
      await session_db.withTransaction(async () => {
        const db = await getDatabase()

        // Fetch child IDs inside the transaction for atomicity
        const [colDocs, envDocs] = await Promise.all([
          db.collection('collections').find({ workspaceId: workspaceOid }, { session: session_db, projection: { _id: 1 } }).toArray(),
          db.collection('environments').find({ workspaceId: workspaceOid }, { session: session_db, projection: { _id: 1 } }).toArray(),
        ])
        const colOids = colDocs.map(d => d._id)
        const envOids = envDocs.map(d => d._id)

        // Step 1: leaf documents (requests, folders, history, activity)
        await Promise.all([
          ...(colOids.length > 0
            ? [
                db.collection('requests').deleteMany({ collectionId: { $in: colOids } }, { session: session_db }),
                db.collection('folders').deleteMany({ collectionId: { $in: colOids } }, { session: session_db }),
              ]
            : []),
          db.collection('request_history').deleteMany({ workspaceId: workspaceOid }, { session: session_db }),
          db.collection('activity_logs').deleteMany({ workspaceId: workspaceOid }, { session: session_db }),
        ])

        // Step 2: workspace-scoped collections and environments
        await Promise.all([
          ...(colOids.length > 0
            ? [db.collection('collections').deleteMany({ _id: { $in: colOids } }, { session: session_db })]
            : []),
          ...(envOids.length > 0
            ? [db.collection('environments').deleteMany({ _id: { $in: envOids } }, { session: session_db })]
            : []),
        ])

        // Step 3: the workspace itself
        await db.collection('workspaces').deleteOne({ _id: workspaceOid }, { session: session_db })
      })
    } finally {
      await session_db.endSession()
    }

    logActivity({ workspaceId: params.id, userId: session.user.id, userName: session.user.name ?? 'User', action: 'deleted', resourceType: 'workspace', resourceName: ws.name })
    return NextResponse.json({ deleted: true })
  })
}
