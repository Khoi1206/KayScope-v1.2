import { z } from 'zod'
import type { HttpMethod } from '@/modules/request/domain/entities/request.entity'

// ── Shared primitives ──────────────────────────────────────────────────────

const nonEmptyString = z.string().trim().min(1)

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const satisfies readonly HttpMethod[]

const kvPairSchema = z.object({
  key: z.string().default(''),
  value: z.string().default(''),
  enabled: z.boolean().default(true),
})

const envVarSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  secret: z.boolean().default(false),
})

const reqBodySchema = z.object({
  type: z.enum(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw']),
  content: z.string().default(''),
  formData: z.array(kvPairSchema).max(100).optional(),
  rawType: z.enum(['text', 'json', 'javascript', 'html', 'xml']).optional(),
})

const reqAuthSchema = z.object({
  type: z.enum(['none', 'bearer', 'basic', 'api-key']),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
  apiKeyHeader: z.string().optional(),
})

// ── Auth ───────────────────────────────────────────────────────────────────

export const registerBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// ── Workspaces ─────────────────────────────────────────────────────────────

export const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional(),
})

export const updateWorkspaceBodySchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').optional(),
  description: z.string().optional(),
})

export const inviteMemberBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']),
})

export const updateMemberRoleBodySchema = z.object({
  role: z.enum(['editor', 'viewer']),
})

// ── Collections ────────────────────────────────────────────────────────────

export const createCollectionBodySchema = z.object({
  workspaceId: nonEmptyString,
  name: nonEmptyString,
  description: z.string().optional(),
})

export const updateCollectionBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
})

// ── Environments ───────────────────────────────────────────────────────────

export const createEnvironmentBodySchema = z.object({
  workspaceId: nonEmptyString,
  name: nonEmptyString,
  variables: z.array(envVarSchema).max(200).default([]),
})

export const updateEnvironmentBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  variables: z.array(envVarSchema).max(200).optional(),
})

// ── Folders ────────────────────────────────────────────────────────────────

export const createFolderBodySchema = z.object({
  collectionId: nonEmptyString,
  name: nonEmptyString,
  parentFolderId: z.string().optional(),
})

export const updateFolderBodySchema = z.object({
  name: nonEmptyString,
})

// ── Requests ───────────────────────────────────────────────────────────────

export const createRequestBodySchema = z.object({
  collectionId: nonEmptyString,
  folderId: z.string().optional(),
  name: nonEmptyString,
  method: z.enum(HTTP_METHODS).default('GET'),
  url: z.string().default(''),
  headers: z.array(kvPairSchema).max(100).optional(),
  params: z.array(kvPairSchema).max(100).optional(),
  body: reqBodySchema.optional(),
  auth: reqAuthSchema.optional(),
  preRequestScript: z.string().optional(),
  postRequestScript: z.string().optional(),
})

export const updateRequestBodySchema = z.object({
  name: z.string().optional(),
  folderId: z.string().nullable().optional(),
  method: z.enum(HTTP_METHODS).optional(),
  url: z.string().optional(),
  headers: z.array(kvPairSchema).max(100).optional(),
  params: z.array(kvPairSchema).max(100).optional(),
  body: reqBodySchema.optional(),
  auth: reqAuthSchema.optional(),
  preRequestScript: z.string().optional(),
  postRequestScript: z.string().optional(),
})

// ── Execute ────────────────────────────────────────────────────────────────

export const executeBodySchema = z.object({
  url: nonEmptyString,
  method: z.enum(HTTP_METHODS),
  headers: z.array(kvPairSchema).max(100).optional(),
  params: z.array(kvPairSchema).max(100).optional(),
  body: reqBodySchema.optional(),
  auth: reqAuthSchema.optional(),
  environmentVariables: z.record(z.string(), z.string()).optional(),
  tempVariables: z.record(z.string(), z.string()).optional(),
  preRequestScript: z.string().optional(),
  postRequestScript: z.string().optional(),
  requestId: z.string().optional(),
  workspaceId: z.string().optional(),
  environmentId: z.string().optional(),
})

// ── Export / Import ────────────────────────────────────────────────────────

export const importBodySchema = z.object({
  workspaceId: nonEmptyString,
  data: z.record(z.string(), z.unknown()),
})

// ── Playwright ─────────────────────────────────────────────────────────────

export const playwrightRunBodySchema = z.object({
  code: z.string().trim().min(1, 'Test code must not be empty'),
})

export const playwrightUiBodySchema = z.object({
  code: z.string().optional(),
})
