import { IFolderRepository } from '../repositories/folder.repository'
import { Folder } from '../entities/folder.entity'

export class GetFoldersUseCase {
  constructor(private readonly folderRepo: IFolderRepository) {}

  async execute(collectionId: string): Promise<Folder[]> {
    return this.folderRepo.findByCollection(collectionId)
  }
}
