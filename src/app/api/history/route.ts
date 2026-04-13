import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createHistoryRepository, createRequestRepository, createCollectionRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { GetHistoryByRequestUseCase } from '@/modules/history/domain/usecases/get-history-by-request.usecase'
import { GetHistoryByWorkspaceCursorUseCase } from '@/modules/history/domain/usecases/get-history-by-workspace-cursor.usecase'
import { getCachedHistory, setCachedHistory } from '@/lib/redis/history-cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()

    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    const requestId = req.nextUrl.searchParams.get('requestId')
    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined
    const limitStr = req.nextUrl.searchParams.get('limit')
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 200) : 50

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

      // First page with no cursor — serve from Redis cache when available
      if (!cursor) {
        const cached = await getCachedHistory(workspaceId)
        if (cached) return NextResponse.json(cached)
      }

      const { items, nextCursor } = await new GetHistoryByWorkspaceCursorUseCase(
        createHistoryRepository(),
      ).execute(workspaceId, limit, cursor)

      const payload = { history: items, nextCursor }

      // Only cache the first page
      if (!cursor) await setCachedHistory(workspaceId, payload)

      return NextResponse.json(payload)
    }

    throw new ValidationError('workspaceId or requestId query param is required')
  })
}
