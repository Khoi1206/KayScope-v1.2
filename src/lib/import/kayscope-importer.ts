import { ObjectId } from 'mongodb'
import type { MongoClient } from 'mongodb'
import type { ICollectionImporter, ImportResult } from './collection-importer.interface'
import type { HttpMethod, RequestBody, RequestAuth } from '@/modules/request/domain/entities/request.entity'

const VALID_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const dbName = () => process.env.MONGODB_DB ?? 'kayscope'

export class KayScopeImporter implements ICollectionImporter {
  detect(data: Record<string, unknown>): boolean {
    return data._type === 'kayscope_collection'
  }

  async import(
    data: Record<string, unknown>,
    workspaceId: string,
    userId: string,
    client: MongoClient,
  ): Promise<ImportResult> {
    const colData = data.collection as { name: string; description?: string }
    const now = new Date()
    const colId = new ObjectId()
    const userOid = new ObjectId(userId)
    const wsOid = new ObjectId(workspaceId)

    // BFS topological sort: parents before children, orphans appended at the end.
    const rawFolders = (data.folders ?? []) as Array<{ id: string; parentFolderId?: string | null; name: string }>
    const folderIdMap: Record<string, ObjectId> = {}
    const folderDocs: object[] = []

    const addedIds = new Set<string>()
    const queue = rawFolders.filter(f => !f.parentFolderId)
    const orderedFolders: typeof rawFolders = []
    while (queue.length > 0) {
      const f = queue.shift()!
      if (addedIds.has(f.id)) continue
      orderedFolders.push(f)
      addedIds.add(f.id)
      for (const child of rawFolders) {
        if (child.parentFolderId === f.id && !addedIds.has(child.id)) queue.push(child)
      }
    }
    for (const f of rawFolders) {
      if (!addedIds.has(f.id)) orderedFolders.push(f)
    }

    for (const f of orderedFolders) {
      const folderId = new ObjectId()
      folderIdMap[f.id] = folderId
      folderDocs.push({
        _id: folderId, collectionId: colId,
        ...(f.parentFolderId && folderIdMap[f.parentFolderId] ? { parentFolderId: folderIdMap[f.parentFolderId] } : {}),
        name: f.name, createdBy: userOid, createdAt: now, updatedAt: now,
      })
    }

    const requests = (data.requests ?? []) as Array<Record<string, unknown>>
    const reqDocs = requests.map(r => {
      const exportedFolderId = r.folderId as string | null | undefined
      const rawMethod = ((r.method as string) || '').toUpperCase()
      return {
        _id: new ObjectId(), collectionId: colId,
        ...(exportedFolderId && folderIdMap[exportedFolderId] ? { folderId: folderIdMap[exportedFolderId] } : {}),
        name: (r.name as string) || 'Imported Request',
        method: (VALID_HTTP_METHODS.has(rawMethod) ? rawMethod : 'GET') as HttpMethod,
        url: (r.url as string) || '',
        headers: (r.headers as Array<{ key: string; value: string; enabled: boolean; description?: string }>) ?? [],
        params: (r.params as Array<{ key: string; value: string; enabled: boolean; description?: string }>) ?? [],
        body: (r.body as RequestBody) ?? { type: 'none', content: '' },
        auth: (r.auth as RequestAuth) ?? { type: 'none' },
        createdBy: userOid, createdAt: now, updatedAt: now,
      }
    })

    const txSession = client.startSession()
    try {
      await txSession.withTransaction(async () => {
        const db = client.db(dbName())
        await db.collection('collections').insertOne({ _id: colId, workspaceId: wsOid, name: colData.name || 'Imported Collection', description: colData.description, createdBy: userOid, createdAt: now, updatedAt: now }, { session: txSession })
        if (folderDocs.length > 0) await db.collection('folders').insertMany(folderDocs, { session: txSession })
        if (reqDocs.length > 0) await db.collection('requests').insertMany(reqDocs, { session: txSession })
      })
    } finally {
      await txSession.endSession()
    }

    return {
      collection: { id: colId.toHexString(), workspaceId, name: colData.name || 'Imported Collection', description: colData.description, createdBy: userId, createdAt: now, updatedAt: now },
      importedRequests: reqDocs.length,
      format: 'kayscope',
    }
  }
}
