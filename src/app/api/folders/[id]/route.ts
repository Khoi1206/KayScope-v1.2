import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { NotFoundError, ValidationError } from '@/lib/errors/ValidationError'
import { createFolderRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import clientPromise, { getDatabase } from '@/lib/db/mongodb'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { logActivity } from '@/lib/activity/log-activity'
import { updateFolderBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

interface Params { params: { id: string } }

/** Resolves a folder's workspace and asserts the caller is a member. */
async function assertFolderMember(collectionId: string, sessionUserId: string) {
  const col = await createCollectionRepository().findById(collectionId)
  if (!col) throw new NotFoundError('Collection')
  await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, sessionUserId)
  return col
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    const parsed = updateFolderBodySchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const repo = createFolderRepository()
    const folder = await repo.findById(params.id)
    if (!folder) throw new NotFoundError('Folder')
    const col = await assertFolderMember(folder.collectionId, session.user.id)
    const updated = await repo.update(params.id, { name: parsed.data.name })
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'updated', resourceType: 'folder', resourceName: parsed.data.name })
    return NextResponse.json({ folder: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createFolderRepository()
    const folder = await repo.findById(params.id)
    if (!folder) throw new NotFoundError('Folder')
    const col = await assertFolderMember(folder.collectionId, session.user.id)

    // Collect this folder and all its descendants using a child-map (O(n) instead of O(n²))
    const allFolders = await repo.findByCollection(folder.collectionId)
    const childrenMap = new Map<string, string[]>()
    for (const f of allFolders) {
      if (f.parentFolderId) {
        if (!childrenMap.has(f.parentFolderId)) childrenMap.set(f.parentFolderId, [])
        childrenMap.get(f.parentFolderId)!.push(f.id)
      }
    }
    const toDelete: string[] = []
    const collectDescendants = (folderId: string) => {
      toDelete.push(folderId)
      for (const childId of childrenMap.get(folderId) ?? []) {
        collectDescendants(childId)
      }
    }
    collectDescendants(params.id)

    // Cascade delete: requests → folders — all-or-nothing across all descendants
    const toDeleteOids = toDelete.map(id => new ObjectId(id))
    const client = await clientPromise
    const txSession = client.startSession()
    try {
      await txSession.withTransaction(async () => {
        const db = await getDatabase()
        await Promise.all([
          db.collection('requests').deleteMany({ folderId: { $in: toDeleteOids } }, { session: txSession }),
          db.collection('folders').deleteMany({ _id: { $in: toDeleteOids } }, { session: txSession }),
        ])
      })
    } finally {
      await txSession.endSession()
    }

    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'deleted', resourceType: 'folder', resourceName: folder.name })
    return NextResponse.json({ deleted: true })
  })
}
