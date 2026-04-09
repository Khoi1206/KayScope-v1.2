/**
 * request-executor.service.ts — SRP + DIP
 *
 * Single responsibility: orchestrate building and dispatching one HTTP request,
 * then return the structured response.
 *
 * Depends on:
 *  - IHttpClient  (DIP — not tied to undici)
 *  - ISsrfGuard   (DIP — not tied to SsrfGuard concrete class)
 *  - Pure functions from interpolate.ts, body-builder.ts, auth-strategy.ts
 *
 * The route handler becomes a thin adapter: parse → delegate → respond.
 */

import logger from '@/lib/logger'
import { buildRequestBody } from '@/lib/api/body-builder'
import { resolveAuthHeaders } from '@/lib/auth/auth-strategy'
import { ValidationError } from '@/lib/errors/ValidationError'
import type { ExecuteRequestDTO, ExecuteResponse } from '@/modules/request/domain/entities/request.entity'
import { interpolate, buildUrl, buildHeaders } from './interpolate'
import type { IHttpClient } from './http-client'
import type { ISsrfGuard } from './ssrf-guard'

// ── I/O types ─────────────────────────────────────────────────────────────────

export interface ExecuteInput {
  dto: ExecuteRequestDTO & {
    requestId?: string
    workspaceId?: string
    environmentId?: string
    tempVariables?: Record<string, string>
  }
  /** Resolved env vars (secrets already decrypted by the route). */
  envVars: Record<string, string>
  /** Temp/override vars from the client session. */
  tempVars: Record<string, string>
}

export interface ExecuteOutput {
  result: ExecuteResponse
  targetUrl: string
  requestHeaders: Record<string, string>
  requestBody: string | undefined
}

// ── Service ───────────────────────────────────────────────────────────────────

export class RequestExecutorService {
  constructor(
    private readonly httpClient: IHttpClient,
    private readonly ssrfGuard: ISsrfGuard,
  ) {}

  async execute(input: ExecuteInput): Promise<ExecuteOutput> {
    const { dto, envVars, tempVars } = input
    const interp = (s: string) => interpolate(s, envVars, tempVars)

    // 1. Build + validate URL
    let targetUrl: URL
    try {
      targetUrl = buildUrl(dto.url, dto.params ?? [], envVars, tempVars)
    } catch {
      throw new ValidationError(`Invalid URL: ${dto.url}`)
    }
    this.ssrfGuard.validate(targetUrl)

    // 2. Build headers (user KVs merged with auth strategy output)
    const headersObj = buildHeaders(dto.headers ?? [], envVars, tempVars)
    Object.assign(headersObj, resolveAuthHeaders(dto.auth ?? { type: 'none' }, interp))

    // 3. Build body (OCP: strategy registry in body-builder.ts)
    const { body: fetchBody, formDataBody } = buildRequestBody(dto.body, headersObj, interp)
    const bodyPayload = (formDataBody ?? fetchBody ?? null) as BodyInit | null

    // Computed identically on both success and error paths — extract once.
    const requestBody = typeof fetchBody === 'string' ? fetchBody
      : formDataBody ? '[form-data]'
      : undefined

    // 4. Dispatch — network errors become status-0 results so the route handler
    //    never needs to distinguish between HTTP and transport failures.
    const startMs = Date.now()
    let fetched: Awaited<ReturnType<IHttpClient['fetch']>>
    try {
      fetched = await this.httpClient.fetch(targetUrl.toString(), {
        method: dto.method,
        headers: headersObj,
        body: bodyPayload,
        onRedirect: (location) => this.ssrfGuard.validate(location),
      })
    } catch (fetchErr) {
      const durationMs = Date.now() - startMs
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      logger.error({ url: targetUrl.toString(), errMsg }, '[execute] Fetch error')
      return {
        result: { status: 0, statusText: 'Network Error', headers: {}, body: JSON.stringify({ error: errMsg }, null, 2), durationMs, size: 0 },
        targetUrl: targetUrl.toString(),
        requestHeaders: headersObj,
        requestBody,
      }
    }

    const durationMs = Date.now() - startMs
    return {
      result: {
        status: fetched.status,
        statusText: fetched.statusText,
        headers: fetched.headers,
        body: fetched.body,
        durationMs,
        // Reuse the byte count already computed during streaming — avoids a second TextEncoder pass.
        size: fetched.byteLength,
      },
      targetUrl: targetUrl.toString(),
      requestHeaders: headersObj,
      requestBody,
    }
  }
}
