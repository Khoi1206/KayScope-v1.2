// ─── Collection Entity ────────────────────────────────────────────────────────

export interface Collection {
  id: string
  workspaceId: string
  name: string
  description?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// DTOs
export interface CreateCollectionDTO {
  workspaceId: string
  name: string
  description?: string
  createdBy: string
}

export interface UpdateCollectionDTO {
  name?: string
  description?: string
}
