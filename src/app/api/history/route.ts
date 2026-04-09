import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createHistoryRepository, createRequestRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { GetHistoryByWorkspaceUseCase } from '@/modules/history/domain/usecases/get-history-by-workspace.usecase'
import { GetHistoryByRequestUseCase } from '@/modules/history/domain/usecases/get-history-by-request.usecase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    const requestId = req.nextUrl.searchParams.get('requestId')
    const limitStr = req.nextUrl.searchParams.get('limit')
    const skipStr = req.nextUrl.searchParams.get('skip')
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 200) : 50
    const skip = skipStr ? Math.max(parseInt(skipStr, 10) || 0, 0) : 0

    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())

    if (requestId) {
      const request = await createRequestRepository().findById(requestId)
      if (!request) throw new NotFoundError('Request')
      const col = await createCollectionRepository().findById(request.collectionId)
      if (!col) throw new NotFoundError('Collection')
      await membershipService.assertMembership(col.workspaceId, session.user.id)
      const entries = await new GetHistoryByRequestUseCase(createHistoryRepository()).execute(requestId, limit)
      return NextResponse.json({ history: entries })
    }
    if (workspaceId) {
      await membershipService.assertMembership(workspaceId, session.user.id)
      const entries = await new GetHistoryByWorkspaceUseCase(createHistoryRepository()).execute(workspaceId, limit, skip)
      return NextResponse.json({ history: entries })
    }

    throw new ValidationError('workspaceId or requestId query param is required')
  })
}
