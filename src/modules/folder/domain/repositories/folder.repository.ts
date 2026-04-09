import { Folder, CreateFolderDTO, UpdateFolderDTO } from '../entities/folder.entity'

export interface IFolderRepository {
  findById(id: string): Promise<Folder | null>
  findByCollection(collectionId: string): Promise<Folder[]>
  create(dto: CreateFolderDTO): Promise<Folder>
  update(id: string, dto: UpdateFolderDTO): Promise<Folder | null>
  delete(id: string): Promise<boolean>
  deleteByCollection(collectionId: string): Promise<void>
}
