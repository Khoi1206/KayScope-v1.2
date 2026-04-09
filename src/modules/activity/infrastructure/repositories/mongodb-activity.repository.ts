import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import type { IActivityRepository } from '../../domain/repositories/activity.repository'
import type { ActivityLog, ActivityAction, ActivityResourceType, CreateActivityLogDTO } from '../../domain/entities/activity.entity'

interface ActivityDocument {
  _id: ObjectId
  workspaceId: ObjectId
  userId: string
  userName: string
  action: ActivityAction
  resourceType: ActivityResourceType
  resourceName: string
  details?: string
  createdAt: Date
}

function toEntity(doc: ActivityDocument): ActivityLog {
  return {
    id: doc._id.toHexString(),
    workspaceId: doc.workspaceId.toHexString(),
    userId: doc.userId,
    userName: doc.userName,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceName: doc.resourceName,
    details: doc.details,
    createdAt: doc.createdAt,
  }
}

// Ensure the compound index is created exactly once per process lifetime.
let indexEnsured: Promise<void> | undefined
async function ensureIndex(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(db => db.collection('activity_logs').createIndex({ workspaceId: 1, createdAt: -1 }))
      .then(() => {})
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBActivityRepository implements IActivityRepository {
  private async collection() {
    await ensureIndex()
    const db = await getDatabase()
    return db.collection<ActivityDocument>('activity_logs')
  }

  async create(dto: CreateActivityLogDTO): Promise<ActivityLog> {
    const col = await this.collection()
    const doc: Omit<ActivityDocument, '_id'> = {
      workspaceId: new ObjectId(dto.workspaceId),
      userId: dto.userId,
      userName: dto.userName,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceName: dto.resourceName,
      details: dto.details,
      createdAt: new Date(),
    }
    const result = await col.insertOne(doc as ActivityDocument)
    return toEntity({ ...doc, _id: result.insertedId })
  }

  async findByWorkspaceSince(workspaceId: string, since: Date): Promise<ActivityLog[]> {
    const col = await this.collection()
    const docs = await col
      .find({ workspaceId: new ObjectId(workspaceId), createdAt: { $gt: since } })
      .sort({ createdAt: 1 })
      .toArray()
    return docs.map(toEntity)
  }

  async findByWorkspace(workspaceId: string, limit = 50, skip = 0): Promise<ActivityLog[]> {
    const col = await this.collection()
    const docs = await col
      .find({ workspaceId: new ObjectId(workspaceId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    return docs.map(toEntity)
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const col = await this.collection()
    return col.countDocuments({ workspaceId: new ObjectId(workspaceId) })
  }

  async deleteByWorkspace(workspaceId: string): Promise<void> {
    const col = await this.collection()
    await col.deleteMany({ workspaceId: new ObjectId(workspaceId) })
  }
}
