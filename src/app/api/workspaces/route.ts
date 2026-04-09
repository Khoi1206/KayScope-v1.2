import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createWorkspaceRepository } from '@/lib/db/repository-factory'
import { CreateWorkspaceUseCase } from '@/modules/workspace/domain/usecases/create-workspace.usecase'
import { GetWorkspacesUseCase } from '@/modules/workspace/domain/usecases/get-workspaces.usecase'
import { ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { createWorkspaceBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

export async function GET() {
  return withApiHandler(async () => {
    const session = await requireSession()
    const repo = createWorkspaceRepository()
    const useCase = new GetWorkspacesUseCase(repo)
    const workspaces = await useCase.execute(session.user.id)
    return NextResponse.json({ workspaces })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = createWorkspaceBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const { name, description } = parsed.data
    const repo = createWorkspaceRepository()
    const useCase = new CreateWorkspaceUseCase(repo)
    const workspace = await useCase.execute({
      name,
      description,
      ownerId: session.user.id,
    })
    logActivity({ workspaceId: workspace.id, userId: session.user.id, userName: session.user.name ?? 'User', action: 'created', resourceType: 'workspace', resourceName: workspace.name })
    return NextResponse.json({ workspace }, { status: 201 })
  })
}
