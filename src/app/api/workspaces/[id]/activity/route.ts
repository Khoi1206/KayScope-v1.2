import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createWorkspaceRepository, createActivityRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { GetActivityUseCase } from '@/modules/activity/domain/usecases/get-activity.usecase'

interface Params { params: { id: string } }

/** GET /api/workspaces/[id]/activity?limit=50&skip=0 */
export async function GET(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(params.id, session.user.id)

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
    const skip = Math.max(parseInt(url.searchParams.get('skip') ?? '0', 10) || 0, 0)

    const { logs, total } = await new GetActivityUseCase(createActivityRepository()).execute(params.id, limit, skip)

    return NextResponse.json({ logs, total, limit, skip })
  })
}
