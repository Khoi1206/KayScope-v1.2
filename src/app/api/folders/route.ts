import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { createFolderRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { CreateFolderUseCase } from '@/modules/folder/domain/usecases/create-folder.usecase'
import { GetFoldersUseCase } from '@/modules/folder/domain/usecases/get-folders.usecase'
import { logActivity } from '@/lib/activity/log-activity'
import { createFolderBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const collectionId = req.nextUrl.searchParams.get('collectionId')
    if (!collectionId) throw new ValidationError('collectionId query param is required')
    const col = await createCollectionRepository().findById(collectionId)
    if (!col) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, session.user.id)
    const folders = await new GetFoldersUseCase(createFolderRepository()).execute(collectionId)
    return NextResponse.json({ folders })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = createFolderBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const { collectionId, name, parentFolderId } = parsed.data
    const col = await createCollectionRepository().findById(collectionId)
    if (!col) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, session.user.id)
    const folder = await new CreateFolderUseCase(createFolderRepository()).execute({
      collectionId,
      parentFolderId: parentFolderId ?? undefined,
      name,
      createdBy: session.user.id,
    })
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'created', resourceType: 'folder', resourceName: folder.name })
    return NextResponse.json({ folder }, { status: 201 })
  })
}

