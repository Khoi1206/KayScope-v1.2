import { SavedRequest, CreateRequestDTO, UpdateRequestDTO } from '../entities/request.entity'

export interface IRequestRepository {
  findById(id: string): Promise<SavedRequest | null>
  findByCollection(collectionId: string): Promise<SavedRequest[]>
  create(dto: CreateRequestDTO): Promise<SavedRequest>
  update(id: string, dto: UpdateRequestDTO): Promise<SavedRequest | null>
  delete(id: string): Promise<boolean>
  clearFolderFromRequests(folderId: string): Promise<void>
  deleteByCollection(collectionId: string): Promise<void>
  deleteByFolder(folderId: string): Promise<void>
}
