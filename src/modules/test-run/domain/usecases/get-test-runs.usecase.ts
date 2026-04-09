import type { ITestRunRepository } from '../repositories/test-run.repository'
import type { TestRun } from '../entities/test-run.entity'

export class GetTestRunsUseCase {
  constructor(private readonly repo: ITestRunRepository) {}

  execute(workspaceId: string, limit?: number, skip?: number): Promise<TestRun[]> {
    return this.repo.findByWorkspace(workspaceId, limit, skip)
  }
}
