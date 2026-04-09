import { ICollectionRepository } from '../repositories/collection.repository'
import { Collection, CreateCollectionDTO } from '../entities/collection.entity'
import { ValidationError } from '@/lib/errors/ValidationError'

export class CreateCollectionUseCase {
  constructor(private readonly collectionRepo: ICollectionRepository) {}

  async execute(dto: CreateCollectionDTO): Promise<Collection> {
    if (!dto.name || dto.name.trim().length < 1) {
      throw new ValidationError('Collection name is required')
    }
    if (dto.name.trim().length > 100) {
      throw new ValidationError('Collection name must be 100 characters or less')
    }
    return this.collectionRepo.create({ ...dto, name: dto.name.trim() })
  }
}
