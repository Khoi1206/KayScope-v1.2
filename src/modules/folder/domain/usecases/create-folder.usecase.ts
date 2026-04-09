import { IFolderRepository } from '../repositories/folder.repository'
import { Folder, CreateFolderDTO } from '../entities/folder.entity'
import { ValidationError } from '@/lib/errors/ValidationError'

export class CreateFolderUseCase {
  constructor(private readonly folderRepo: IFolderRepository) {}

  async execute(dto: CreateFolderDTO): Promise<Folder> {
    if (!dto.name || dto.name.trim().length < 1) {
      throw new ValidationError('Folder name is required')
    }
    if (dto.name.trim().length > 100) {
      throw new ValidationError('Folder name must be 100 characters or less')
    }
    return this.folderRepo.create({ ...dto, name: dto.name.trim() })
  }
}
