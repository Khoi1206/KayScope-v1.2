import type { TestRun, CreateTestRunDTO, UpdateTestRunDTO } from '../entities/test-run.entity'

export interface ITestRunRepository {
  findByWorkspace(workspaceId: string, limit?: number, skip?: number): Promise<TestRun[]>
  findById(id: string): Promise<TestRun | null>
  create(dto: CreateTestRunDTO): Promise<TestRun>
  update(id: string, dto: UpdateTestRunDTO): Promise<TestRun | null>
  delete(id: string): Promise<boolean>
}
