import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import { IWorkspaceRepository } from '../../domain/repositories/workspace.repository'
import { Workspace, CreateWorkspaceDTO, UpdateWorkspaceDTO, WorkspaceMember } from '../../domain/entities/workspace.entity'

interface WorkspaceDocument {
  _id: ObjectId
  name: string
  description?: string
  ownerId: ObjectId
  members: WorkspaceMember[]
  createdAt: Date
  updatedAt: Date
}

function toEntity(doc: WorkspaceDocument): Workspace {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    ownerId: doc.ownerId.toHexString(),
    members: doc.members ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(async db => {
        const col = db.collection('workspaces')
        await col.createIndex({ ownerId: 1 }).catch(() => {})
        await col.createIndex({ 'members.userId': 1 }).catch(() => {})
      })
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBWorkspaceRepository implements IWorkspaceRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<WorkspaceDocument>('workspaces')
  }

  async findById(id: string): Promise<Workspace | null> {
    const col = await this.collection()
    const doc = await col.findOne({ _id: new ObjectId(id) })
    return doc ? toEntity(doc) : null
  }

  async findByOwner(ownerId: string): Promise<Workspace[]> {
    const col = await this.collection()
    const docs = await col.find({ ownerId: new ObjectId(ownerId) }).sort({ createdAt: -1 }).toArray()
    return docs.map(toEntity)
  }

  async findByMember(userId: string): Promise<Workspace[]> {
    const col = await this.collection()
    const docs = await col.find({ 'members.userId': userId }).sort({ createdAt: -1 }).toArray()
    return docs.map(toEntity)
  }

  async create(dto: CreateWorkspaceDTO): Promise<Workspace> {
    const col = await this.collection()
    const now = new Date()
    const doc: Omit<WorkspaceDocument, '_id'> = {
      name: dto.name,
      description: dto.description,
      ownerId: new ObjectId(dto.ownerId),
      members: [],
      createdAt: now,
      updatedAt: now,
    }
    const result = await col.insertOne(doc as WorkspaceDocument)
    return toEntity({ ...doc, _id: result.insertedId } as WorkspaceDocument)
  }

  async update(id: string, dto: UpdateWorkspaceDTO): Promise<Workspace | null> {
    const col = await this.collection()
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...dto, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async addMember(workspaceId: string, userId: string, role: string): Promise<Workspace | null> {
    const col = await this.collection()
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(workspaceId), 'members.userId': { $ne: userId } },
      { $push: { members: { userId, role, joinedAt: new Date() } as WorkspaceMember }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string): Promise<Workspace | null> {
    const col = await this.collection()
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(workspaceId), 'members.userId': userId },
      { $set: { 'members.$.role': role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return result ? toEntity(result) : null
  }

  async removeMember(workspaceId: string, userId: string): Promise<Workspace | null> {
    const col = await this.collection()
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(workspaceId) },
      { $pull: { members: { userId } }, $set: { updatedAt: new Date() } },
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
