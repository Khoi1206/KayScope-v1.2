import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createWorkspaceRepository, createActivityRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { GetActivityCursorUseCase } from '@/modules/activity/domain/usecases/get-activity-cursor.usecase'
import { getCachedActivity, setCachedActivity } from '@/lib/redis/activity-cache'

interface Params { params: { id: string } }

/** GET /api/workspaces/[id]/activity?limit=50&cursor=<hex> */
export async function GET(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(params.id, session.user.id)

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
    const cursor = url.searchParams.get('cursor') ?? undefined

    // First page with no cursor — serve from Redis cache when available
    if (!cursor) {
      const cached = await getCachedActivity(params.id)
      if (cached) return NextResponse.json(cached)
    }

    const { items, nextCursor } = await new GetActivityCursorUseCase(
      createActivityRepository(),
    ).execute(params.id, limit, cursor)

    const payload = { logs: items, nextCursor }

    // Only cache the first page
    if (!cursor) await setCachedActivity(params.id, payload)

    return NextResponse.json(payload)
  })
}
