import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { createWorkspaceRepository, createActivityRepository } from '@/lib/db/repository-factory'
import { WorkspaceMembershipService } from '@/lib/workspace/workspace-membership.service'
import { NotFoundError } from '@/lib/errors/ValidationError'

export const dynamic = 'force-dynamic'

const POLL_INTERVAL_MS = 4000
const HEARTBEAT_INTERVAL_MS = 20000
/** Max concurrent SSE connections per user per workspace (e.g. multiple tabs). */
const MAX_CONNECTIONS_PER_USER = 5

/**
 * Tracks active SSE connections: key = `${userId}:${workspaceId}`, value = count.
 * Module-level so it persists across requests on the same server instance.
 */
const activeConnections = new Map<string, number>()

function connectionKey(userId: string, workspaceId: string) {
  return `${userId}:${workspaceId}`
}

interface Params { params: { id: string } }

/**
 * GET /api/workspaces/[id]/sync
 *
 * Server-Sent Events stream. Polls MongoDB every 4 s for new activity logs
 * and pushes them to connected clients. Clients use this to detect when
 * teammates make changes and re-fetch the relevant data.
 *
 * Each user is limited to MAX_CONNECTIONS_PER_USER concurrent connections per
 * workspace to prevent runaway MongoDB poll loops from multiple open tabs.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Verify workspace access
  try {
    await new WorkspaceMembershipService(createWorkspaceRepository()).assertMembership(params.id, session.user.id)
  } catch (e) {
    if (e instanceof NotFoundError) return new Response('Not Found', { status: 404 })
    return new Response('Forbidden', { status: 403 })
  }

  // Enforce per-user connection cap before opening the stream
  const connKey = connectionKey(session.user.id, params.id)
  const currentCount = activeConnections.get(connKey) ?? 0
  if (currentCount >= MAX_CONNECTIONS_PER_USER) {
    return new Response('Too many connections', { status: 429 })
  }
  activeConnections.set(connKey, currentCount + 1)

  const activityRepo = createActivityRepository()
  const encoder = new TextEncoder()
  let lastChecked = new Date()
  let closed = false
  // Declared here so cancel() can clear them
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { closed = true }
      }

      // Send initial connected event
      send('connected', { workspaceId: params.id, userId: session.user.id })

      // Poll loop
      pollTimer = setInterval(async () => {
        if (closed) return
        try {
          const since = lastChecked
          lastChecked = new Date()
          const logs = await activityRepo.findByWorkspaceSince(params.id, since)
          for (const log of logs) {
            send('activity', {
              id: log.id,
              workspaceId: log.workspaceId,
              action: log.action,
              resourceType: log.resourceType,
              resourceName: log.resourceName,
              userName: log.userName,
              userId: log.userId,
              details: log.details,
              createdAt: log.createdAt,
            })
          }
        } catch { /* swallow poll errors — connection stays alive */ }
      }, POLL_INTERVAL_MS)

      // Heartbeat to keep proxies / load balancers from closing idle connections
      heartbeatTimer = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch { closed = true }
      }, HEARTBEAT_INTERVAL_MS)
    },
    cancel() {
      closed = true
      clearInterval(pollTimer)
      clearInterval(heartbeatTimer)
      // Decrement connection count; clean up zero-count keys to prevent map growth
      const count = activeConnections.get(connKey) ?? 1
      if (count <= 1) activeConnections.delete(connKey)
      else activeConnections.set(connKey, count - 1)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
