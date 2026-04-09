import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import { ICollectionRepository } from '../../domain/repositories/collection.repository'
import { Collection, CreateCollectionDTO, UpdateCollectionDTO } from '../../domain/entities/collection.entity'

interface CollectionDocument {
  _id: ObjectId
  workspaceId: ObjectId
  name: string
  description?: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

function toEntity(doc: CollectionDocument): Collection {
  return {
    id: doc._id.toHexString(),
    workspaceId: doc.workspaceId.toHexString(),
    name: doc.name,
    description: doc.description,
    createdBy: doc.createdBy.toHexString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(db => db.collection('collections').createIndex({ workspaceId: 1 }))
      .then(() => {})
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBCollectionRepository implements ICollectionRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<CollectionDocument>('collections')
  }

  async findById(id: string): Promise<Collection | null> {
    const col = await this.collection()
    const doc = await col.findOne({ _id: new ObjectId(id) })
    return doc ? toEntity(doc) : null
  }

  async findByWorkspace(workspaceId: string): Promise<Collection[]> {
    const col = await this.collection()
    const docs = await col.find({ workspaceId: new ObjectId(workspaceId) }).sort({ createdAt: -1 }).toArray()
    return docs.map(toEntity)
  }

  async create(dto: CreateCollectionDTO): Promise<Collection> {
    const col = await this.collection()
    const now = new Date()
    const doc: Omit<CollectionDocument, '_id'> = {
      workspaceId: new ObjectId(dto.workspaceId),
      name: dto.name,
      description: dto.description,
      createdBy: new ObjectId(dto.createdBy),
      createdAt: now,
      updatedAt: now,
    }
    const result = await col.insertOne(doc as CollectionDocument)
    return toEntity({ ...doc, _id: result.insertedId } as CollectionDocument)
  }

  async update(id: string, dto: UpdateCollectionDTO): Promise<Collection | null> {
    const col = await this.collection()
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...dto, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.collection()
    const result = await col.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }
}
