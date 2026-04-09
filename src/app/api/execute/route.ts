import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { ValidationError } from '@/lib/errors/ValidationError'
import type { ExecuteRequestDTO } from '@/modules/request/domain/entities/request.entity'
import { createHistoryRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { getCachedEnvironment } from '@/lib/execute/env-cache'
import { executeBodySchema } from '@/lib/schemas'
import logger from '@/lib/logger'
import { createRateLimiter } from '@/lib/api/rate-limiter'
import { getClientIp } from '@/lib/api/http-utils'
import { UndiciHttpClient } from '@/lib/execute/http-client'
import { SsrfGuard } from '@/lib/execute/ssrf-guard'
import { RequestExecutorService } from '@/lib/execute/request-executor.service'

// 30 executions per minute per IP
const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })

// Singleton service wired with concrete implementations (DIP at the composition root)
const executorService = new RequestExecutorService(new UndiciHttpClient(), new SsrfGuard())

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withApiHandler(async () => {
    const session = await requireSession()

    if (!await rateLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const raw = await req.json()
    const bodyParsed = executeBodySchema.safeParse(raw)
    if (!bodyParsed.success) throw new ValidationError(bodyParsed.error.issues[0].message)

    const dto = bodyParsed.data as ExecuteRequestDTO & {
      requestId?: string
      workspaceId?: string
      environmentId?: string
      tempVariables?: Record<string, string>
    }

    // SECURITY: verify the caller is a member of the supplied workspace before
    // decrypting environment secrets or writing history to it.
    if (dto.workspaceId) {
      const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
      await membershipService.assertMembership(dto.workspaceId, session.user.id)
    }

    // Overlay decrypted secret values from MongoDB — the client only has masked
    // empty strings for secrets, so we fetch and inject the plaintext here.
    const envVars: Record<string, string> = { ...(dto.environmentVariables ?? {}) }
    const tempVars: Record<string, string> = { ...(dto.tempVariables ?? {}) }

    if (dto.environmentId) {
      const env = await getCachedEnvironment(dto.environmentId)
      // Sanity check: confirm the environment belongs to the stated workspace
      // (membership already verified above; this prevents cross-workspace env ID misuse).
      if (env && dto.workspaceId && env.workspaceId === dto.workspaceId) {
        for (const v of env.variables) {
          if (v.enabled && v.key && v.secret) envVars[v.key] = v.value
        }
      }
    }

    const { result, targetUrl, requestHeaders, requestBody } =
      await executorService.execute({ dto, envVars, tempVars })

    // Persist to history (fire-and-forget — never blocks the response).
    // Membership was verified above, so workspaceId is safe to record as-is.
    if (dto.workspaceId && session.user.id) {
      createHistoryRepository().create({
        requestId: dto.requestId,
        workspaceId: dto.workspaceId,
        userId: session.user.id,
        method: dto.method,
        url: targetUrl,
        requestHeaders,
        requestBody,
        status: result.status,
        statusText: result.statusText,
        responseHeaders: result.headers,
        responseBody: result.body.slice(0, 50_000), // cap stored body at 50 KB
        durationMs: result.durationMs,
        size: result.size,
      }).catch((err) => { logger.error({ err }, '[execute] Failed to persist history') })
    }

    return NextResponse.json(result)
  })
}
