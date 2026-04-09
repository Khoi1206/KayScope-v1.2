// ─── Request Entity ───────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'
export type RawBodyType = 'text' | 'json' | 'javascript' | 'html' | 'xml'

export interface RequestBody {
  type: BodyType
  content: string
  /** Sub-type when type === 'raw' (e.g. json, text, html). Defaults to 'json'. */
  rawType?: RawBodyType
  /** Key-value pairs used when type === 'form-data' or 'x-www-form-urlencoded'. */
  formData?: KeyValuePair[]
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key'

export interface RequestAuth {
  type: AuthType
  token?: string
  username?: string
  password?: string
  apiKey?: string
  apiKeyHeader?: string
}

export interface SavedRequest {
  id: string
  collectionId: string
  folderId?: string
  name: string
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth: RequestAuth
  preRequestScript?: string
  postRequestScript?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// DTOs
export interface CreateRequestDTO {
  collectionId: string
  folderId?: string
  name: string
  method: HttpMethod
  url: string
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: RequestBody
  auth?: RequestAuth
  preRequestScript?: string
  postRequestScript?: string
  createdBy: string
}

export interface UpdateRequestDTO {
  name?: string
  folderId?: string | null
  method?: HttpMethod
  url?: string
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: RequestBody
  auth?: RequestAuth
  preRequestScript?: string
  postRequestScript?: string
}

// Execute payload (ephemeral, not persisted)
export interface ExecuteRequestDTO {
  method: HttpMethod
  url: string
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: RequestBody
  auth?: RequestAuth
  environmentVariables?: Record<string, string>
  tempVariables?: Record<string, string>
}

export interface ExecuteResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  durationMs: number
  size: number
}
