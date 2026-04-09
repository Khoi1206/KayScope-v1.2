/* ─── Client-side types ──────────────────────────────────────────────── */

export interface Workspace { id: string; name: string; description?: string; ownerId: string; members: { userId: string; role: string }[] }
export interface MemberInfo { userId: string; role: string; name: string; email: string; joinedAt: string }
export interface Collection { id: string; name: string; workspaceId: string; description?: string }
export interface Folder { id: string; collectionId: string; parentFolderId?: string; name: string }
export interface SavedRequest {
  id: string; collectionId: string; folderId?: string; name: string
  method: HttpMethod; url: string
  headers: KV[]; params: KV[]; body: ReqBody; auth: ReqAuth
  preRequestScript?: string; postRequestScript?: string
}
export interface Environment {
  id: string; name: string; workspaceId: string
  variables: EnvVar[]
}
export interface EnvVar { key: string; value: string; enabled: boolean; secret: boolean }
export interface ExecResponse {
  status: number; statusText: string; headers: Record<string, string>
  body: string; durationMs: number; size: number
}
export interface ActivityLogEntry {
  id: string; workspaceId: string; userId: string; userName: string
  action: string; resourceType: string; resourceName: string
  details?: string; createdAt: string
}
export interface HistoryEntry {
  id: string; requestId?: string; workspaceId: string; userId: string
  method: string; url: string; requestHeaders: Record<string, string>; requestBody?: string
  status: number; statusText: string; responseHeaders: Record<string, string>
  responseBody: string; durationMs: number; size: number; createdAt: string
}
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
export type RequestEditorTab = 'Params' | 'Headers' | 'Body' | 'Authorization' | 'Pre-request' | 'Post-request'
export interface KV { key: string; value: string; enabled: boolean; description?: string }
export type RawBodyType = 'text' | 'json' | 'javascript' | 'html' | 'xml'
export interface ReqBody { type: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'; content: string; rawType?: RawBodyType; formData?: KV[] }
export interface ReqAuth { type: 'none' | 'bearer' | 'basic' | 'api-key'; token?: string; username?: string; password?: string; apiKey?: string; apiKeyHeader?: string }
export type ScriptResult = { logs: { level: 'log' | 'warn' | 'error'; message: string }[]; tests: { name: string; passed: boolean; error?: string }[]; error?: string }
export interface TabSnapshot {
  activeReq: SavedRequest | null; isDraft: boolean; draftColId: string | null; draftFolderId: string | null
  reqName: string; method: HttpMethod; url: string; params: KV[]; headers: KV[]; body: ReqBody; auth: ReqAuth
  activeTab: RequestEditorTab
  preRequestScript: string; postRequestScript: string; tempVars: Record<string, string>
  preScriptResult: ScriptResult | null; postScriptResult: ScriptResult | null
  response: ExecResponse | null; responseTab: 'Pretty' | 'Headers' | 'Cookies' | 'Timing' | 'Raw'
  requestTiming: { dns: number; connect: number; tls: number; firstByte: number; download: number; total: number } | null
  sendError: string | null; isSending: boolean
  varOverrides: Record<string, string>
}
export interface RequestTabMeta {
  id: string; label: string; method: HttpMethod; savedReqId: string | null; snapshot: TabSnapshot | null
  dirty?: boolean
}
export interface FolderNode {
  folder: Folder
  children: FolderNode[]
  requests: SavedRequest[]
}
export interface FolderTreeResult {
  rootRequests: SavedRequest[]
  rootFolders: FolderNode[]
}
