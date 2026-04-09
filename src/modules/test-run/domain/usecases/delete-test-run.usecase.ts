import type { ITestRunRepository } from '../repositories/test-run.repository'
import type { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError } from '@/lib/errors/ValidationError'

export class DeleteTestRunUseCase {
  constructor(
    private readonly repo: ITestRunRepository,
    private readonly membershipService: WorkspaceMembershipService,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const run = await this.repo.findById(id)
    if (!run) throw new NotFoundError('Test run')
    await this.membershipService.assertMembership(run.workspaceId, userId)
    await this.repo.delete(id)
  }
}
