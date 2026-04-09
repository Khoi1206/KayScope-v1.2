import { Collection, CreateCollectionDTO, UpdateCollectionDTO } from '../entities/collection.entity'

export interface ICollectionRepository {
  findById(id: string): Promise<Collection | null>
  findByWorkspace(workspaceId: string): Promise<Collection[]>
  create(dto: CreateCollectionDTO): Promise<Collection>
  update(id: string, dto: UpdateCollectionDTO): Promise<Collection | null>
  delete(id: string): Promise<boolean>
}
