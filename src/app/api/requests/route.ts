import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createRequestRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { CreateRequestUseCase } from '@/modules/request/domain/usecases/create-request.usecase'
import { GetRequestsUseCase } from '@/modules/request/domain/usecases/get-requests.usecase'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { createRequestBodySchema } from '@/lib/schemas'
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
    const requests = await new GetRequestsUseCase(createRequestRepository()).execute(collectionId)
    return NextResponse.json({ requests })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = createRequestBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const { collectionId, folderId, name, method, url, headers, params: queryParams, body: reqBody, auth, preRequestScript, postRequestScript } = parsed.data
    const col = await createCollectionRepository().findById(collectionId)
    if (!col) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(col.workspaceId, session.user.id)
    const request = await new CreateRequestUseCase(createRequestRepository()).execute({
      collectionId, folderId, name, method, url, headers, params: queryParams,
      body: reqBody, auth, preRequestScript, postRequestScript, createdBy: session.user.id,
    })
    logActivity({ workspaceId: col.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'created', resourceType: 'request', resourceName: request.name, details: `${request.method} ${request.url || '(no url)'}` })
    return NextResponse.json({ request }, { status: 201 })
  })
}

