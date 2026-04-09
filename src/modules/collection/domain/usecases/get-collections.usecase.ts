import { ICollectionRepository } from '../repositories/collection.repository'
import { Collection } from '../entities/collection.entity'

export class GetCollectionsUseCase {
  constructor(private readonly collectionRepo: ICollectionRepository) {}

  async execute(workspaceId: string): Promise<Collection[]> {
    return this.collectionRepo.findByWorkspace(workspaceId)
  }
}
