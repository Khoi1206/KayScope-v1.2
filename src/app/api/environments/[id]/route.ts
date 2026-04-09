import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createEnvironmentRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError, ValidationError } from '@/lib/errors/ValidationError'
import { logActivity } from '@/lib/activity/log-activity'
import { invalidateEnvCache } from '@/lib/execute/env-cache'
import { updateEnvironmentBodySchema } from '@/lib/schemas'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'
import type { Environment } from '@/modules/environment/domain/entities/environment.entity'

interface Params { params: { id: string } }

/** Replace plaintext secret values with '' before sending to the client. */
function maskSecrets(env: Environment): Environment {
  return {
    ...env,
    variables: env.variables.map(v => (v.secret ? { ...v, value: '' } : v)),
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const repo = createEnvironmentRepository()
    const env = await repo.findById(params.id)
    if (!env) throw new NotFoundError('Environment')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(env.workspaceId, session.user.id)
    return NextResponse.json({ environment: maskSecrets(env) })
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createEnvironmentRepository()
    const env = await repo.findById(params.id)
    if (!env) throw new NotFoundError('Environment')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertCreatorOrOwner(env.createdBy, env.workspaceId, session.user.id)
    const body = await req.json()
    const parsed = updateEnvironmentBodySchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

    // For secret variables sent with an empty value, the client has a masked ""
    // (the UI never shows or transmits the plaintext). Preserve the existing
    // plaintext value from the DB (already decrypted by toEntity) so the repo
    // can re-encrypt it unchanged.
    let mergedVariables = parsed.data.variables
    if (mergedVariables) {
      mergedVariables = mergedVariables.map(v => {
        if (v.secret && v.value === '') {
          const existing = env.variables.find(e => e.key === v.key)
          return existing ? { ...v, value: existing.value } : v
        }
        return v
      })
    }

    const updated = await repo.update(params.id, { ...parsed.data, variables: mergedVariables })
    await invalidateEnvCache(params.id)
    logActivity({ workspaceId: env.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'updated', resourceType: 'environment', resourceName: parsed.data.name ?? env.name })
    return NextResponse.json({ environment: updated ? maskSecrets(updated) : null })
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const session = await requireSession()
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const repo = createEnvironmentRepository()
    const env = await repo.findById(params.id)
    if (!env) throw new NotFoundError('Environment')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertCreatorOrOwner(env.createdBy, env.workspaceId, session.user.id)
    await repo.delete(params.id)
    await invalidateEnvCache(params.id)
    logActivity({ workspaceId: env.workspaceId, userId: session.user.id, userName: session.user.name ?? 'User', action: 'deleted', resourceType: 'environment', resourceName: env.name })
    return NextResponse.json({ deleted: true })
  })
}

