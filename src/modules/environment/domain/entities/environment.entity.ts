// ─── Environment Entity ───────────────────────────────────────────────────────

export interface EnvironmentVariable {
  key: string
  value: string
  enabled: boolean
  secret: boolean
}

export interface Environment {
  id: string
  workspaceId: string
  name: string
  variables: EnvironmentVariable[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// DTOs
export interface CreateEnvironmentDTO {
  workspaceId: string
  name: string
  variables?: EnvironmentVariable[]
  createdBy: string
}

export interface UpdateEnvironmentDTO {
  name?: string
  variables?: EnvironmentVariable[]
}
