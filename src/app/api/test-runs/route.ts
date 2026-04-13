import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createTestRunRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { GetTestRunsUseCase } from '@/modules/test-run/domain/usecases/get-test-runs.usecase'
import { CreateTestRunUseCase } from '@/modules/test-run/domain/usecases/create-test-run.usecase'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'
import { ValidationError } from '@/lib/errors/ValidationError'

export const dynamic = 'force-dynamic'

const testResultSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    duration: z.number(),
  }),
  tests: z.array(z.object({
    testName: z.string(),
    status: z.string(),
    duration: z.number(),
    error: z.string().optional(),
  })),
  rawOutput: z.string(),
  generatedCode: z.string(),
})

const createTestRunSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  code: z.string(),
  blocklyState: z.unknown().optional(),
  result: testResultSchema,
  savedAt: z.string(),
})

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()
    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) throw new ValidationError('workspaceId query param is required')
    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
    await membershipService.assertMembership(workspaceId, session.user.id)
    const runs = await new GetTestRunsUseCase(createTestRunRepository()).execute(workspaceId)
    return NextResponse.json({ runs })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await requireSession()
    const body = await req.json()
    const parsed = createTestRunSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
    const { workspaceId, name, code, blocklyState, result, savedAt } = parsed.data
    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
    await membershipService.assertMembership(workspaceId, session.user.id)
    const run = await new CreateTestRunUseCase(createTestRunRepository()).execute({
      workspaceId,
      userId: session.user.id,
      name,
      code,
      blocklyState: blocklyState as object | undefined,
      result: result as import('@/app/test-builder/types').RunResult,
      savedAt,
    })
    return NextResponse.json({ run }, { status: 201 })
  })
}
