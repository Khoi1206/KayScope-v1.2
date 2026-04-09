import { IRequestRepository } from '../repositories/request.repository'
import { SavedRequest, CreateRequestDTO } from '../entities/request.entity'
import { ValidationError } from '@/lib/errors/ValidationError'

export class CreateRequestUseCase {
  constructor(private readonly requestRepo: IRequestRepository) {}

  async execute(dto: CreateRequestDTO): Promise<SavedRequest> {
    if (!dto.name || dto.name.trim().length < 1) {
      throw new ValidationError('Request name is required')
    }
    return this.requestRepo.create({
      ...dto,
      name: dto.name.trim(),
      headers: dto.headers ?? [],
      params: dto.params ?? [],
      body: dto.body ?? { type: 'none', content: '' },
      auth: dto.auth ?? { type: 'none' },
    })
  }
}
