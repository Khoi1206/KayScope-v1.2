import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { ValidationError, NotFoundError } from '@/lib/errors/ValidationError'
import { createCollectionRepository, createRequestRepository, createFolderRepository, createWorkspaceRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'

/**
 * GET /api/export?collectionId=xxx
 * Exports a collection and all its requests as JSON.
 * To import, use POST /api/import (backed by the COLLECTION_IMPORTERS registry).
 */
export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const session = await requireSession()

    const collectionId = req.nextUrl.searchParams.get('collectionId')
    if (!collectionId) throw new ValidationError('collectionId query param is required')

    const colRepo = createCollectionRepository()
    const reqRepo = createRequestRepository()
    const folderRepo = createFolderRepository()

    const collection = await colRepo.findById(collectionId)
    if (!collection) throw new NotFoundError('Collection')
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(collection.workspaceId, session.user.id)

    const [requests, folders] = await Promise.all([
      reqRepo.findByCollection(collectionId),
      folderRepo.findByCollection(collectionId),
    ])

    const exportData = {
      _type: 'kayscope_collection',
      _version: '1.1',
      exportedAt: new Date().toISOString(),
      collection: {
        name: collection.name,
        description: collection.description ?? '',
      },
      folders: folders.map(f => ({
        id: f.id,
        parentFolderId: f.parentFolderId ?? null,
        name: f.name,
      })),
      requests: requests.map(r => ({
        name: r.name,
        folderId: r.folderId ?? null,
        method: r.method,
        url: r.url,
        headers: r.headers,
        params: r.params,
        body: r.body,
        auth: r.auth,
      })),
    }

    return NextResponse.json(exportData)
  })
}
