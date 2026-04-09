import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import { IRequestRepository } from '../../domain/repositories/request.repository'
import {
  SavedRequest, CreateRequestDTO, UpdateRequestDTO,
  KeyValuePair, RequestBody, RequestAuth,
} from '../../domain/entities/request.entity'

interface RequestDocument {
  _id: ObjectId
  collectionId: ObjectId
  folderId?: ObjectId
  name: string
  method: string
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth: RequestAuth
  preRequestScript?: string
  postRequestScript?: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

function toEntity(doc: RequestDocument): SavedRequest {
  return {
    id: doc._id.toHexString(),
    collectionId: doc.collectionId.toHexString(),
    folderId: doc.folderId?.toHexString(),
    name: doc.name,
    method: doc.method as SavedRequest['method'],
    url: doc.url,
    headers: doc.headers ?? [],
    params: doc.params ?? [],
    body: doc.body ?? { type: 'none', content: '' },
    auth: doc.auth ?? { type: 'none' },
    preRequestScript: doc.preRequestScript,
    postRequestScript: doc.postRequestScript,
    createdBy: doc.createdBy.toHexString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(db => Promise.all([
        db.collection('requests').createIndex({ collectionId: 1 }),
        db.collection('requests').createIndex({ folderId: 1 }),
      ]))
      .then(() => {})
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBRequestRepository implements IRequestRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<RequestDocument>('requests')
  }

  async findById(id: string): Promise<SavedRequest | null> {
    const col = await this.collection()
    const doc = await col.findOne({ _id: new ObjectId(id) })
    return doc ? toEntity(doc) : null
  }

  async findByCollection(collectionId: string): Promise<SavedRequest[]> {
    const col = await this.collection()
    const docs = await col.find({ collectionId: new ObjectId(collectionId) }).sort({ createdAt: -1 }).toArray()
    return docs.map(toEntity)
  }

  async create(dto: CreateRequestDTO): Promise<SavedRequest> {
    const col = await this.collection()
    const now = new Date()
    const doc: Omit<RequestDocument, '_id'> = {
      collectionId: new ObjectId(dto.collectionId),
      ...(dto.folderId ? { folderId: new ObjectId(dto.folderId) } : {}),
      name: dto.name,
      method: dto.method,
      url: dto.url ?? '',
      headers: dto.headers ?? [],
      params: dto.params ?? [],
      body: dto.body ?? { type: 'none', content: '' },
      auth: dto.auth ?? { type: 'none' },
      preRequestScript: dto.preRequestScript,
      postRequestScript: dto.postRequestScript,
      createdBy: new ObjectId(dto.createdBy),
      createdAt: now,
      updatedAt: now,
    }
    const result = await col.insertOne(doc as RequestDocument)
    return toEntity({ ...doc, _id: result.insertedId } as RequestDocument)
  }

  async update(id: string, dto: UpdateRequestDTO): Promise<SavedRequest | null> {
    const col = await this.collection()
    const { folderId, ...rest } = dto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setDoc: any = { ...rest, updatedAt: new Date() }
    if (folderId !== undefined && folderId !== null) {
      setDoc.folderId = new ObjectId(folderId)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = { $set: setDoc }
    if (folderId === null) {
      updateOp.$unset = { folderId: '' }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateOp,
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.collection()
    const result = await col.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  }

  async clearFolderFromRequests(folderId: string): Promise<void> {
    const col = await this.collection()
    await col.updateMany(
      { folderId: new ObjectId(folderId) },
      { $unset: { folderId: '' }, $set: { updatedAt: new Date() } }
    )
  }

  async deleteByCollection(collectionId: string): Promise<void> {
    const col = await this.collection()
    await col.deleteMany({ collectionId: new ObjectId(collectionId) })
  }

  async deleteByFolder(folderId: string): Promise<void> {
    const col = await this.collection()
    await col.deleteMany({ folderId: new ObjectId(folderId) })
  }
}
