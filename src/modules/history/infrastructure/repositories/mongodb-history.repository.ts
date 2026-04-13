import { ObjectId, type Filter } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import type { IHistoryRepository } from '../../domain/repositories/history.repository'
import type { RequestHistory, CreateHistoryDTO } from '../../domain/entities/history.entity'

interface HistoryDocument {
  _id: ObjectId
  requestId?: ObjectId
  workspaceId: ObjectId
  userId: ObjectId
  method: string
  url: string
  requestHeaders: Record<string, string>
  requestBody?: string
  status: number
  statusText: string
  responseHeaders: Record<string, string>
  responseBody: string
  durationMs: number
  size: number
  createdAt: Date
}

function toEntity(doc: HistoryDocument): RequestHistory {
  return {
    id: doc._id.toHexString(),
    requestId: doc.requestId?.toHexString(),
    workspaceId: doc.workspaceId.toHexString(),
    userId: doc.userId.toHexString(),
    method: doc.method,
    url: doc.url,
    requestHeaders: doc.requestHeaders ?? {},
    requestBody: doc.requestBody,
    status: doc.status,
    statusText: doc.statusText,
    responseHeaders: doc.responseHeaders ?? {},
    responseBody: doc.responseBody ?? '',
    durationMs: doc.durationMs,
    size: doc.size,
    createdAt: doc.createdAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(async db => {
        const col = db.collection('request_history')
        await col.createIndex({ workspaceId: 1, createdAt: -1 }).catch(() => {})
        await col.createIndex({ requestId: 1, createdAt: -1 }).catch(() => {})
        await col.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 30 * 24 * 60 * 60 },  // 30 ngày
        ).catch(() => {})
      })
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBHistoryRepository implements IHistoryRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<HistoryDocument>('request_history')
  }

  async findByWorkspace(workspaceId: string, limit = 50, skip = 0): Promise<RequestHistory[]> {
    const col = await this.collection()
    const docs = await col
      .find({ workspaceId: new ObjectId(workspaceId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    return docs.map(toEntity)
  }

  async findByWorkspaceCursor(
    workspaceId: string,
    limit = 50,
    afterId?: string,
  ): Promise<{ items: RequestHistory[], nextCursor: string | null }> {
    const col = await this.collection()
    const query: Filter<HistoryDocument> = { workspaceId: new ObjectId(workspaceId) }
    if (afterId) query._id = { $lt: new ObjectId(afterId) }
    const docs = await col.find(query).sort({ _id: -1 }).limit(limit).toArray()
    return {
      items: docs.map(toEntity),
      nextCursor: docs.length === limit ? docs[docs.length - 1]._id.toHexString() : null,
    }
  }

  async findByRequest(requestId: string, limit = 20): Promise<RequestHistory[]> {
    const col = await this.collection()
    const docs = await col
      .find({ requestId: new ObjectId(requestId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return docs.map(toEntity)
  }

  async create(dto: CreateHistoryDTO): Promise<RequestHistory> {
    const col = await this.collection()
    const doc: Omit<HistoryDocument, '_id'> = {
      requestId: dto.requestId ? new ObjectId(dto.requestId) : undefined,
      workspaceId: new ObjectId(dto.workspaceId),
      userId: new ObjectId(dto.userId),
      method: dto.method,
      url: dto.url,
      requestHeaders: dto.requestHeaders,
      requestBody: dto.requestBody,
      status: dto.status,
      statusText: dto.statusText,
      responseHeaders: dto.responseHeaders,
      responseBody: dto.responseBody,
      durationMs: dto.durationMs,
      size: dto.size,
      createdAt: new Date(),
    }
    const result = await col.insertOne(doc as HistoryDocument)
    return toEntity({ _id: result.insertedId, ...doc } as HistoryDocument)
  }

  async deleteByWorkspace(workspaceId: string): Promise<boolean> {
    const col = await this.collection()
    const result = await col.deleteMany({ workspaceId: new ObjectId(workspaceId) })
    return result.deletedCount > 0
  }

  async delete(id: string): Promise<boolean> {
    try {
      const col = await this.collection()
      const result = await col.deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount === 1
    } catch {
      return false
    }
  }
}
