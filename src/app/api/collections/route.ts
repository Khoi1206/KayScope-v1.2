import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { CreateCollectionUseCase } from '@/modules/collection/domain/usecases/create-collection.usecase'
import { GetCollectionsUseCase } from '@/modules/collection/domain/usecases/get-collections.usecase'
import { ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { createCollectionBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) throw new ValidationError('workspaceId query param is required')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(workspaceId, session.user.id)
    const collections = await new GetCollectionsUseCase(createCollectionRepository()).execute(workspaceId)
    return NextResponse.json({ collections })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = createCollectionBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const { workspaceId, name, description } = parsed.data
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(workspaceId, session.user.id)
    const collection = await new CreateCollectionUseCase(createCollectionRepository()).execute({
      workspaceId, name, description, createdBy: session.user.id,
    })
    logActivity({ workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'created', resourceType: 'collection', resourceName: collection.name })
    return NextResponse.json({ collection }, { status: 201 })
  })
}
