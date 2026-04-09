import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createEnvironmentRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { CreateEnvironmentUseCase } from '@/modules/environment/domain/usecases/create-environment.usecase'
import { GetEnvironmentsUseCase } from '@/modules/environment/domain/usecases/get-environments.usecase'
import { ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { createEnvironmentBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'
import type { Environment } from '@/modules/environment/domain/entities/environment.entity'

/** Replace the plaintext secret values with empty strings before sending to the client.
 *  The actual values live encrypted in MongoDB; the client never receives them. */
function maskSecrets(env: Environment): Environment {
  return {
    ...env,
    variables: env.variables.map(v => (v.secret ? { ...v, value: '' } : v)),
  }
}

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) throw new ValidationError('workspaceId query param is required')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(workspaceId, session.user.id)
    const envs = await new GetEnvironmentsUseCase(createEnvironmentRepository()).execute(workspaceId)
    return NextResponse.json({ environments: envs.map(maskSecrets) })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const raw = await req.json()
    const parsed = createEnvironmentBodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
    const { workspaceId, name, variables } = parsed.data
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(workspaceId, session.user.id)
    const env = await new CreateEnvironmentUseCase(createEnvironmentRepository()).execute({
      workspaceId, name, variables, createdBy: session.user.id,
    })
    logActivity({ workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'created', resourceType: 'environment', resourceName: env.name })
    return NextResponse.json({ environment: maskSecrets(env) }, { status: 201 })
  })
}


