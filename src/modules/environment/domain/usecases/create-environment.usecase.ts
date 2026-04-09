import { IEnvironmentRepository } from '../repositories/environment.repository'
import { Environment, CreateEnvironmentDTO } from '../entities/environment.entity'
import { ValidationError } from '@/lib/errors/ValidationError'

export class CreateEnvironmentUseCase {
  constructor(private readonly envRepo: IEnvironmentRepository) {}

  async execute(dto: CreateEnvironmentDTO): Promise<Environment> {
    if (!dto.name || dto.name.trim().length < 1) {
      throw new ValidationError('Environment name is required')
    }
    return this.envRepo.create({
      ...dto,
      name: dto.name.trim(),
      variables: dto.variables ?? [],
    })
  }
}
