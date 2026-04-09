import type { ITestRunRepository } from '../repositories/test-run.repository'
import type { TestRun, UpdateTestRunDTO } from '../entities/test-run.entity'
import type { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError } from '@/lib/errors/ValidationError'

export class UpdateTestRunUseCase {
  constructor(
    private readonly repo: ITestRunRepository,
    private readonly membershipService: WorkspaceMembershipService,
  ) {}

  async execute(id: string, userId: string, dto: UpdateTestRunDTO): Promise<TestRun> {
    const run = await this.repo.findById(id)
    if (!run) throw new NotFoundError('Test run')
    await this.membershipService.assertMembership(run.workspaceId, userId)
    const updated = await this.repo.update(id, dto)
    if (!updated) throw new NotFoundError('Test run')
    return updated
  }
}
