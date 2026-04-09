import { ObjectId } from 'mongodb'
import type { MongoClient } from 'mongodb'
import type { ICollectionImporter, ImportResult } from './collection-importer.interface'
import type { HttpMethod, RequestBody, RequestAuth } from '@/modules/request/domain/entities/request.entity'

const VALID_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const dbName = () => process.env.MONGODB_DB ?? 'kayscope'

export class PostmanImporter implements ICollectionImporter {
  detect(data: Record<string, unknown>): boolean {
    return !!(data.info && data.item)
  }

  async import(
    data: Record<string, unknown>,
    workspaceId: string,
    userId: string,
    client: MongoClient,
  ): Promise<ImportResult> {
    const info = data.info as { name?: string; description?: string }
    const now = new Date()
    const colId = new ObjectId()
    const userOid = new ObjectId(userId)
    const wsOid = new ObjectId(workspaceId)

    const items = (data.item ?? []) as Array<Record<string, unknown>>
    const folderDocs: object[] = []

    interface ReqEntry { name: string; folderId: ObjectId | undefined; request: Record<string, unknown> }

    // Synchronous recursive walk — builds folder docs in memory (no DB calls during traversal).
    function collectRequests(
      items: Array<Record<string, unknown>>,
      parentFolderId: ObjectId | undefined,
      depth = 0,
    ): ReqEntry[] {
      if (depth > 20) return []
      const result: ReqEntry[] = []
      for (const item of items) {
        if (item.request) {
          result.push({ name: (item.name as string) || 'Request', folderId: parentFolderId, request: item.request as Record<string, unknown> })
        }
        if (Array.isArray(item.item)) {
          const folderId = new ObjectId()
          folderDocs.push({ _id: folderId, collectionId: colId, ...(parentFolderId ? { parentFolderId } : {}), name: (item.name as string) || 'Folder', createdBy: userOid, createdAt: now, updatedAt: now })
          result.push(...collectRequests(item.item as Array<Record<string, unknown>>, folderId, depth + 1))
        }
      }
      return result
    }

    const entries = collectRequests(items, undefined)

    const reqDocs = entries.map(({ name, folderId, request }) => {
      const rawMethod = (typeof request.method === 'string' ? request.method : 'GET').toUpperCase()
      const method = VALID_HTTP_METHODS.has(rawMethod) ? rawMethod : 'GET'

      let url = ''
      if (typeof request.url === 'string') url = request.url
      else if (request.url && typeof request.url === 'object') url = (request.url as { raw?: string }).raw ?? ''

      const rawHeaders = (request.header ?? []) as Array<{ key: string; value: string; disabled?: boolean; description?: string }>
      const headers = rawHeaders.map(h => ({ key: h.key, value: h.value, enabled: !h.disabled, description: h.description ?? '' }))

      const urlQueryParams = (typeof request.url === 'object' && request.url !== null)
        ? ((request.url as { query?: Array<{ key: string; value: string; disabled?: boolean; description?: string }> }).query ?? []) : []
      const params = urlQueryParams.map(q => ({ key: q.key, value: q.value ?? '', enabled: !q.disabled, description: q.description ?? '' }))

      let bodyOut: RequestBody = { type: 'none', content: '' }
      const rawBody = request.body as { mode?: string; raw?: string; options?: { raw?: { language?: string } }; urlencoded?: Array<{ key: string; value: string; disabled?: boolean; description?: string }>; formdata?: Array<{ key: string; value: string; disabled?: boolean; description?: string }> } | undefined
      if (rawBody?.mode === 'raw' && rawBody.raw) {
        const lang = rawBody.options?.raw?.language ?? 'text'
        bodyOut = { type: 'raw', content: rawBody.raw, rawType: lang as RequestBody['rawType'] }
      } else if (rawBody?.mode === 'urlencoded') {
        bodyOut = { type: 'x-www-form-urlencoded', content: '', formData: (rawBody.urlencoded ?? []).map(kv => ({ key: kv.key, value: kv.value, enabled: !kv.disabled, description: kv.description ?? '' })) }
      } else if (rawBody?.mode === 'formdata') {
        bodyOut = { type: 'form-data', content: '', formData: (rawBody.formdata ?? []).map(kv => ({ key: kv.key, value: kv.value ?? '', enabled: !kv.disabled, description: kv.description ?? '' })) }
      }

      let authOut: RequestAuth = { type: 'none' }
      const rawAuth = request.auth as { type?: string; bearer?: Array<{ key: string; value: string }>; basic?: Array<{ key: string; value: string }> } | undefined
      if (rawAuth?.type === 'bearer') {
        const t = rawAuth.bearer?.find(b => b.key === 'token')
        authOut = { type: 'bearer', token: t?.value ?? '' }
      } else if (rawAuth?.type === 'basic') {
        const u = rawAuth.basic?.find(b => b.key === 'username')
        const p = rawAuth.basic?.find(b => b.key === 'password')
        authOut = { type: 'basic', username: u?.value ?? '', password: p?.value ?? '' }
      }

      return {
        _id: new ObjectId(), collectionId: colId,
        ...(folderId ? { folderId } : {}),
        name, method: method as HttpMethod, url, headers, params, body: bodyOut, auth: authOut,
        createdBy: userOid, createdAt: now, updatedAt: now,
      }
    })

    const txSession = client.startSession()
    try {
      await txSession.withTransaction(async () => {
        const db = client.db(dbName())
        await db.collection('collections').insertOne({ _id: colId, workspaceId: wsOid, name: info.name || 'Postman Import', description: typeof info.description === 'string' ? info.description : '', createdBy: userOid, createdAt: now, updatedAt: now }, { session: txSession })
        if (folderDocs.length > 0) await db.collection('folders').insertMany(folderDocs, { session: txSession })
        if (reqDocs.length > 0) await db.collection('requests').insertMany(reqDocs, { session: txSession })
      })
    } finally {
      await txSession.endSession()
    }

    return {
      collection: { id: colId.toHexString(), workspaceId, name: info.name || 'Postman Import', description: typeof info.description === 'string' ? info.description : '', createdBy: userId, createdAt: now, updatedAt: now },
      importedRequests: reqDocs.length,
      format: 'postman',
    }
  }
}
