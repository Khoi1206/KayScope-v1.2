/**
 * openapi-parser.ts — Parses OpenAPI 3.x (JSON or YAML) into KayScope import format.
 *
 * Produces an intermediate structure that the import route can use with existing
 * CreateCollectionUseCase + CreateRequestUseCase / CreateFolderUseCase.
 */

import type { HttpMethod, RequestBody, RequestAuth } from '@/modules/request/domain/entities/request.entity'

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

export interface ParsedRequest {
  name: string
  tag: string | undefined
  method: HttpMethod
  url: string
  headers: { key: string; value: string; enabled: boolean; description: string }[]
  params: { key: string; value: string; enabled: boolean; description: string }[]
  body: RequestBody
  auth: RequestAuth
  description: string
}

export interface ParsedOpenApiCollection {
  name: string
  description: string
  /** Folder name → requests */
  folders: Map<string, ParsedRequest[]>
  /** Requests with no tag go here */
  ungrouped: ParsedRequest[]
}

/** Detect if an object looks like an OpenAPI 3.x document. */
export function isOpenApi(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.openapi === 'string' && d.openapi.startsWith('3.') && typeof d.paths === 'object'
}

/** Extract a base URL from the servers array (first entry). */
function extractBaseUrl(servers: unknown): string {
  if (!Array.isArray(servers) || servers.length === 0) return ''
  const first = servers[0] as { url?: string }
  return typeof first.url === 'string' ? first.url.replace(/\/$/, '') : ''
}

/** Build a JSON body content string from an OpenAPI schema example or schema properties. */
function buildBodyExample(content: Record<string, unknown>): string {
  // Prefer application/json
  const jsonContent = content['application/json'] as { example?: unknown; examples?: Record<string, { value?: unknown }>; schema?: { properties?: Record<string, unknown>; example?: unknown } } | undefined
  if (!jsonContent) return ''
  if (jsonContent.example !== undefined) return JSON.stringify(jsonContent.example, null, 2)
  if (jsonContent.examples) {
    const first = Object.values(jsonContent.examples)[0]
    if (first?.value !== undefined) return JSON.stringify(first.value, null, 2)
  }
  if (jsonContent.schema?.example !== undefined) return JSON.stringify(jsonContent.schema.example, null, 2)
  // Fallback: generate skeleton from properties
  if (jsonContent.schema?.properties) {
    const skeleton: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(jsonContent.schema.properties)) {
      const prop = v as { type?: string; example?: unknown }
      skeleton[k] = prop.example ?? (prop.type === 'integer' ? 0 : prop.type === 'boolean' ? false : '')
    }
    return JSON.stringify(skeleton, null, 2)
  }
  return ''
}

export function parseOpenApi(data: unknown): ParsedOpenApiCollection {
  const doc = data as {
    info?: { title?: string; description?: string }
    servers?: unknown[]
    paths?: Record<string, Record<string, unknown>>
  }

  const name = doc.info?.title ?? 'OpenAPI Import'
  const description = typeof doc.info?.description === 'string' ? doc.info.description : ''
  const baseUrl = extractBaseUrl(doc.servers)

  const folders = new Map<string, ParsedRequest[]>()
  const ungrouped: ParsedRequest[] = []

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const [rawMethod, operationRaw] of Object.entries(pathItem)) {
      const method = rawMethod.toUpperCase()
      if (!VALID_METHODS.has(method)) continue

      const op = operationRaw as {
        summary?: string
        description?: string
        tags?: string[]
        parameters?: Array<{
          in: string
          name: string
          description?: string
          required?: boolean
          schema?: { type?: string; example?: unknown }
          example?: unknown
        }>
        requestBody?: {
          content?: Record<string, unknown>
          required?: boolean
        }
      }

      const url = `${baseUrl}${path}`
      const reqName = op.summary ?? `${method} ${path}`
      const tag = op.tags?.[0]

      // Query params from parameters
      const params = (op.parameters ?? [])
        .filter(p => p.in === 'query')
        .map(p => ({
          key: p.name,
          value: String(p.example ?? p.schema?.example ?? ''),
          enabled: true,
          description: p.description ?? '',
        }))

      // Headers from parameters
      const headers = (op.parameters ?? [])
        .filter(p => p.in === 'header')
        .map(p => ({
          key: p.name,
          value: String(p.example ?? p.schema?.example ?? ''),
          enabled: true,
          description: p.description ?? '',
        }))

      // Body
      let body: RequestBody = { type: 'none', content: '' }
      if (op.requestBody?.content) {
        const content = op.requestBody.content as Record<string, unknown>
        if (content['application/json'] !== undefined) {
          const example = buildBodyExample(content)
          body = { type: 'json', content: example }
        } else if (content['application/x-www-form-urlencoded'] !== undefined) {
          body = { type: 'x-www-form-urlencoded', content: '', formData: [] }
        } else if (content['multipart/form-data'] !== undefined) {
          body = { type: 'form-data', content: '', formData: [] }
        }
      }

      const parsed: ParsedRequest = {
        name: reqName,
        tag,
        method: method as HttpMethod,
        url,
        headers,
        params,
        body,
        auth: { type: 'none' },
        description: op.description ?? '',
      }

      if (tag) {
        if (!folders.has(tag)) folders.set(tag, [])
        folders.get(tag)!.push(parsed)
      } else {
        ungrouped.push(parsed)
      }
    }
  }

  return { name, description, folders, ungrouped }
}
