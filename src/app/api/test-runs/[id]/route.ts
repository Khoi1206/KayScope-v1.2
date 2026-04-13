import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { createTestRunRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { UpdateTestRunUseCase } from '@/modules/test-run/domain/usecases/update-test-run.usecase'
import { DeleteTestRunUseCase } from '@/modules/test-run/domain/usecases/delete-test-run.usecase'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'
import { ValidationError } from '@/lib/errors/ValidationError'

export const dynamic = 'force-dynamic'

const updateTestRunSchema = z.object({
  result: z.object({
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
  }),
  savedAt: z.string(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiHandler(async () => {
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await requireSession()
    const body = await req.json()
    const parsed = updateTestRunSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body')
    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
    const useCase = new UpdateTestRunUseCase(createTestRunRepository(), membershipService)
    const updated = await useCase.execute(
      params.id,
      session.user.id,
      parsed.data as import('@/modules/test-run/domain/entities/test-run.entity').UpdateTestRunDTO,
    )
    return NextResponse.json({ run: updated })
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiHandler(async () => {
    if (!await mutationLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await requireSession()
    const membershipService = new WorkspaceMembershipService(createWorkspaceRepository())
    await new DeleteTestRunUseCase(createTestRunRepository(), membershipService).execute(
      params.id,
      session.user.id,
    )
    return NextResponse.json({ ok: true })
  })
}
