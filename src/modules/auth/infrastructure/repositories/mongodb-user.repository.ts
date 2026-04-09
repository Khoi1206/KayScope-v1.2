import { ObjectId } from 'mongodb'
import { getDatabase } from '@/lib/db/mongodb'
import type { IUserRepository } from '../../domain/repositories/user.repository'
import type {
  CreateUserDTO,
  UpdateUserDTO,
  User,
} from '../../domain/entities/user.entity'

/**
 * MongoDB document shape (uses _id instead of id).
 * Kept separate from the domain entity to avoid coupling.
 */
interface UserDocument {
  _id: ObjectId
  name: string
  email: string
  password?: string
  avatar?: string
  provider: string
  providerId?: string
  createdAt: Date
  updatedAt: Date
}

/** Map a MongoDB document → domain entity */
function toEntity(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    email: doc.email,
    password: doc.password,
    avatar: doc.avatar,
    provider: doc.provider,
    providerId: doc.providerId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/**
 * MongoDBUserRepository — Implements IUserRepository using MongoDB native driver.
 *
 * Infrastructure layer: knows about MongoDB, implements the domain contract.
 */
let indexEnsured: Promise<void> | undefined
async function ensureIndexes(): Promise<void> {
  if (!indexEnsured) {
    indexEnsured = getDatabase()
      .then(db => db.collection('users').createIndex({ email: 1 }, { unique: true }))
      .then(() => {})
      .catch(() => {})
  }
  return indexEnsured
}

export class MongoDBUserRepository implements IUserRepository {
  private readonly collectionName = 'users'

  private async getCollection() {
    await ensureIndexes()
    const db = await getDatabase()
    return db.collection<UserDocument>(this.collectionName)
  }

  async findById(id: string): Promise<User | null> {
    try {
      const collection = await this.getCollection()
      const doc = await collection.findOne({ _id: new ObjectId(id) })
      return doc ? toEntity(doc) : null
    } catch {
      // Invalid ObjectId
      return null
    }
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return []
    try {
      const collection = await this.getCollection()
      const objectIds = ids.flatMap(id => { try { return [new ObjectId(id)] } catch { return [] } })
      const docs = await collection.find({ _id: { $in: objectIds } }).toArray()
      return docs.map(toEntity)
    } catch {
      return []
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection()
    const doc = await collection.findOne({
      email: email.toLowerCase().trim(),
    })
    return doc ? toEntity(doc) : null
  }

  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    const collection = await this.getCollection()
    const doc = await collection.findOne({ provider, providerId })
    return doc ? toEntity(doc) : null
  }

  async create(data: CreateUserDTO): Promise<User> {
    const collection = await this.getCollection()
    const now = new Date()

    const doc: Omit<UserDocument, '_id'> = {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      provider: 'credentials',
      createdAt: now,
      updatedAt: now,
    }

    const result = await collection.insertOne(doc as UserDocument)

    return toEntity({
      ...doc,
      _id: result.insertedId,
    } as UserDocument)
  }

  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    try {
      const collection = await this.getCollection()
      const now = new Date()

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...data, updatedAt: now } },
        { returnDocument: 'after' }
      )

      return result ? toEntity(result) : null
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const collection = await this.getCollection()
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount === 1
    } catch {
      return false
    }
  }
}
