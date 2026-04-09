import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import type { ITestRunRepository } from '../../domain/repositories/test-run.repository'
import type { TestRun, CreateTestRunDTO, UpdateTestRunDTO } from '../../domain/entities/test-run.entity'
import type { RunResult } from '@/app/test-builder/types'

interface TestRunDocument {
  _id: ObjectId
  workspaceId: ObjectId
  userId: ObjectId
  name: string
  code: string
  blocklyState?: object
  result: RunResult
  savedAt: string
  createdAt: Date
}

function toEntity(doc: TestRunDocument): TestRun {
  return {
    id: doc._id.toHexString(),
    workspaceId: doc.workspaceId.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    code: doc.code,
    blocklyState: doc.blocklyState,
    result: doc.result,
    savedAt: doc.savedAt,
    createdAt: doc.createdAt,
  }
}

let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(async db => {
        const col = db.collection('test_runs')
        await col.createIndex({ workspaceId: 1, createdAt: -1 }).catch(() => {})
      })
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBTestRunRepository implements ITestRunRepository {
  private async collection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<TestRunDocument>('test_runs')
  }

  async findByWorkspace(workspaceId: string, limit = 50, skip = 0): Promise<TestRun[]> {
    const col = await this.collection()
    const docs = await col
      .find({ workspaceId: new ObjectId(workspaceId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    return docs.map(toEntity)
  }

  async findById(id: string): Promise<TestRun | null> {
    try {
      const col = await this.collection()
      const doc = await col.findOne({ _id: new ObjectId(id) })
      return doc ? toEntity(doc) : null
    } catch {
      return null
    }
  }

  async create(dto: CreateTestRunDTO): Promise<TestRun> {
    const col = await this.collection()
    const doc: Omit<TestRunDocument, '_id'> = {
      workspaceId: new ObjectId(dto.workspaceId),
      userId: new ObjectId(dto.userId),
      name: dto.name,
      code: dto.code,
      blocklyState: dto.blocklyState,
      result: dto.result,
      savedAt: dto.savedAt,
      createdAt: new Date(),
    }
    const result = await col.insertOne(doc as TestRunDocument)
    return toEntity({ _id: result.insertedId, ...doc } as TestRunDocument)
  }

  async update(id: string, dto: UpdateTestRunDTO): Promise<TestRun | null> {
    try {
      const col = await this.collection()
      const result = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { result: dto.result, savedAt: dto.savedAt } },
        { returnDocument: 'after' }
      )
      return result ? toEntity(result) : null
    } catch {
      return null
    }
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
