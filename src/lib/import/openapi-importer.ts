import { ObjectId } from 'mongodb'
import type { MongoClient } from 'mongodb'
import { isOpenApi, parseOpenApi } from './openapi-parser'
import type { ICollectionImporter, ImportResult } from './collection-importer.interface'

const dbName = () => process.env.MONGODB_DB ?? 'kayscope'

export class OpenApiImporter implements ICollectionImporter {
  detect(data: Record<string, unknown>): boolean {
    return isOpenApi(data)
  }

  async import(
    data: Record<string, unknown>,
    workspaceId: string,
    userId: string,
    client: MongoClient,
  ): Promise<ImportResult> {
    const parsed = parseOpenApi(data)
    const now = new Date()
    const colId = new ObjectId()
    const userOid = new ObjectId(userId)
    const wsOid = new ObjectId(workspaceId)

    const folderDocs: object[] = []
    const reqDocs: object[] = []

    for (const [tag, requests] of parsed.folders) {
      const folderId = new ObjectId()
      folderDocs.push({ _id: folderId, collectionId: colId, name: tag, createdBy: userOid, createdAt: now, updatedAt: now })
      for (const r of requests) {
        reqDocs.push({ _id: new ObjectId(), collectionId: colId, folderId, name: r.name, method: r.method, url: r.url, headers: r.headers, params: r.params, body: r.body, auth: r.auth, createdBy: userOid, createdAt: now, updatedAt: now })
      }
    }
    for (const r of parsed.ungrouped) {
      reqDocs.push({ _id: new ObjectId(), collectionId: colId, name: r.name, method: r.method, url: r.url, headers: r.headers, params: r.params, body: r.body, auth: r.auth, createdBy: userOid, createdAt: now, updatedAt: now })
    }

    const txSession = client.startSession()
    try {
      await txSession.withTransaction(async () => {
        const db = client.db(dbName())
        await db.collection('collections').insertOne({ _id: colId, workspaceId: wsOid, name: parsed.name, description: parsed.description, createdBy: userOid, createdAt: now, updatedAt: now }, { session: txSession })
        if (folderDocs.length > 0) await db.collection('folders').insertMany(folderDocs, { session: txSession })
        if (reqDocs.length > 0) await db.collection('requests').insertMany(reqDocs, { session: txSession })
      })
    } finally {
      await txSession.endSession()
    }

    return {
      collection: { id: colId.toHexString(), workspaceId, name: parsed.name, description: parsed.description, createdBy: userId, createdAt: now, updatedAt: now },
      importedRequests: reqDocs.length,
      format: 'openapi',
    }
  }
}
