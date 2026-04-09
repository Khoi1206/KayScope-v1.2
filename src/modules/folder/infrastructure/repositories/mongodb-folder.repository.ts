import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import { IFolderRepository } from '../../domain/repositories/folder.repository'
import { Folder, CreateFolderDTO, UpdateFolderDTO } from '../../domain/entities/folder.entity'

interface FolderDocument {
  _id: ObjectId
  collectionId: ObjectId
  parentFolderId?: ObjectId
  name: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

function toEntity(doc: FolderDocument): Folder {
  return {
    id: doc._id.toHexString(),
    collectionId: doc.collectionId.toHexString(),
    parentFolderId: doc.parentFolderId?.toHexString(),
    name: doc.name,
    createdBy: doc.createdBy.toHexString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(async db => {
        const col = db.collection('folders')
        await col.createIndex({ collectionId: 1 }).catch(() => {})
        await col.createIndex({ parentFolderId: 1 }).catch(() => {})
      })
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBFolderRepository implements IFolderRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<FolderDocument>('folders')
  }

  async findById(id: string): Promise<Folder | null> {
    try {
      const col = await this.collection()
      const doc = await col.findOne({ _id: new ObjectId(id) })
      return doc ? toEntity(doc) : null
    } catch { return null }
  }

  async findByCollection(collectionId: string): Promise<Folder[]> {
    const col = await this.collection()
    const docs = await col
      .find({ collectionId: new ObjectId(collectionId) })
      .sort({ createdAt: 1 })
      .toArray()
    return docs.map(toEntity)
  }

  async create(dto: CreateFolderDTO): Promise<Folder> {
    const col = await this.collection()
    const now = new Date()
    const doc: Omit<FolderDocument, '_id'> = {
      collectionId: new ObjectId(dto.collectionId),
      parentFolderId: dto.parentFolderId ? new ObjectId(dto.parentFolderId) : undefined,
      name: dto.name,
      createdBy: new ObjectId(dto.createdBy),
      createdAt: now,
      updatedAt: now,
    }
    const result = await col.insertOne(doc as FolderDocument)
    return toEntity({ ...doc, _id: result.insertedId } as FolderDocument)
  }

  async update(id: string, dto: UpdateFolderDTO): Promise<Folder | null> {
    const col = await this.collection()
    const setFields: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.name !== undefined) setFields.name = dto.name
    if (dto.parentFolderId !== undefined)
      setFields.parentFolderId = dto.parentFolderId ? new ObjectId(dto.parentFolderId) : null
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: setFields },
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.collection()
    const result = await col.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }

  async deleteByCollection(collectionId: string): Promise<void> {
    const col = await this.collection()
    await col.deleteMany({ collectionId: new ObjectId(collectionId) })
  }
}
