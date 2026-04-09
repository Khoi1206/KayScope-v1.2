import { IWorkspaceRepository } from '../repositories/workspace.repository'
import { Workspace, CreateWorkspaceDTO } from '../entities/workspace.entity'
import { ValidationError } from '@/lib/errors/ValidationError'

export class CreateWorkspaceUseCase {
  constructor(private readonly workspaceRepo: IWorkspaceRepository) {}

  async execute(dto: CreateWorkspaceDTO): Promise<Workspace> {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new ValidationError('Workspace name must be at least 2 characters')
    }
    if (dto.name.trim().length > 100) {
      throw new ValidationError('Workspace name must be 100 characters or less')
    }
    return this.workspaceRepo.create({
      ...dto,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    })
  }
}
