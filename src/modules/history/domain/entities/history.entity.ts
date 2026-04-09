// ─── Request History Entity ───────────────────────────────────────────────────

export interface RequestHistory {
  id: string
  requestId?: string       // linked saved request (optional — can be an ad-hoc execution)
  workspaceId: string
  userId: string

  // Request snapshot
  method: string
  url: string
  requestHeaders: Record<string, string>
  requestBody?: string

  // Response snapshot
  status: number
  statusText: string
  responseHeaders: Record<string, string>
  responseBody: string
  durationMs: number
  size: number

  createdAt: Date
}

export interface CreateHistoryDTO {
  requestId?: string
  workspaceId: string
  userId: string
  method: string
  url: string
  requestHeaders: Record<string, string>
  requestBody?: string
  status: number
  statusText: string
  responseHeaders: Record<string, string>
  responseBody: string
  durationMs: number
  size: number
}
