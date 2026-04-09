import type { ITestRunRepository } from '../repositories/test-run.repository'
import type { TestRun, CreateTestRunDTO } from '../entities/test-run.entity'

export class CreateTestRunUseCase {
  constructor(private readonly repo: ITestRunRepository) {}

  execute(dto: CreateTestRunDTO): Promise<TestRun> {
    return this.repo.create(dto)
  }
}
