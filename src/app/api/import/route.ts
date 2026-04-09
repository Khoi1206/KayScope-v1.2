/**
 * POST /api/import
 *
 * Accepts either:
 *  - multipart/form-data with `file` (JSON or YAML) + `workspaceId` fields
 *  - application/json body with `{ workspaceId, data }` (legacy / programmatic)
 *
 * Format detection and import logic are handled by COLLECTION_IMPORTERS
 * (OCP registry in lib/import/importer-registry.ts). Adding a new import format
 * requires only a new ICollectionImporter class — this route is not modified.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { withApiHandler } from '@/lib/api/api-handler'
import { ValidationError } from '@/lib/errors/ValidationError'
import { createWorkspaceRepository } from '@/lib/db/repository-factory'
import clientPromise from '@/lib/db/mongodb'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { createRateLimiter } from '@/lib/api/rate-limiter'
import { getClientIp } from '@/lib/api/http-utils'
import { COLLECTION_IMPORTERS } from '@/lib/import/importer-registry'
import logger from '@/lib/logger'

// 10 file imports per minute per IP (heavier operation than regular API calls)
const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  return withApiHandler(async () => {
    const session = await requireSession()

    if (!await rateLimiter.check(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    let workspaceId: string
    let rawData: unknown

    if (contentType.includes('multipart/form-data')) {
      // ── File upload ────────────────────────────────────────────────────────
      let formData: FormData
      try {
        formData = await req.formData()
      } catch {
        throw new ValidationError('Failed to parse form data')
      }

      workspaceId = (formData.get('workspaceId') as string | null) ?? ''
      if (!workspaceId) throw new ValidationError('workspaceId is required')

      const file = formData.get('file') as File | null
      if (!file) throw new ValidationError('file is required')
      if (file.size > MAX_FILE_SIZE) throw new ValidationError('File exceeds 5 MB limit')

      const text = await file.text()

      const filename = file.name.toLowerCase()
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        try {
          const yaml = await import('js-yaml')
          rawData = yaml.load(text)
        } catch (err) {
          logger.warn({ err }, '[import] YAML parse error')
          throw new ValidationError('Invalid YAML file')
        }
      } else {
        try {
          rawData = JSON.parse(text)
        } catch {
          throw new ValidationError('Invalid JSON file')
        }
      }
    } else {
      // ── JSON body (legacy / programmatic) ──────────────────────────────────
      const body = await req.json() as { workspaceId?: string; data?: unknown }
      workspaceId = body.workspaceId ?? ''
      if (!workspaceId) throw new ValidationError('workspaceId is required')
      if (!body.data) throw new ValidationError('data is required')
      rawData = body.data
    }

    await new WorkspaceMembershipService(createWorkspaceRepository())
      .assertMembership(workspaceId, session.user.id)

    const client = await clientPromise
    const data = rawData as Record<string, unknown>

    const importer = COLLECTION_IMPORTERS.find(i => i.detect(data))
    if (!importer) {
      throw new ValidationError('Unsupported format. Supports OpenAPI 3.x (JSON/YAML), Postman v2.1, and KayScope exports.')
    }

    const result = await importer.import(data, workspaceId, session.user.id, client)
    return NextResponse.json(result, { status: 201 })
  })
}
