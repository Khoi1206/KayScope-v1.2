import { IEnvironmentRepository } from '../repositories/environment.repository'
import { Environment } from '../entities/environment.entity'

export class GetEnvironmentsUseCase {
  constructor(private readonly envRepo: IEnvironmentRepository) {}

  async execute(workspaceId: string): Promise<Environment[]> {
    return this.envRepo.findByWorkspace(workspaceId)
  }
}
