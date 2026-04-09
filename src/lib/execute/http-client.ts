/**
 * http-client.ts — DIP
 *
 * IHttpClient decouples the executor service from undici.
 * Swap transports (node:https, test mock) by providing a different implementation.
 */

import { Agent, fetch as undiciFetch } from 'undici'

const MAX_BODY_BYTES = 10 * 1024 * 1024 // 10 MB hard cap
const MAX_REDIRECTS = 10

// Set for O(1) lookup — avoids re-allocating an array on every request.
const NO_BODY_METHODS = new Set(['GET', 'HEAD'])

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HttpFetchOptions {
  method: string
  headers: Record<string, string>
  body?: BodyInit | null
  signal?: AbortSignal
  /**
   * Called before following each redirect. Throw to abort (e.g., SSRF validation).
   * Without this hook `redirect: 'follow'` would let redirects bypass SSRF guards.
   */
  onRedirect?: (location: URL) => void
}

export interface HttpFetchResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  /** Raw byte count of the response body (before the truncation notice, if any). */
  byteLength: number
}

// ── Abstraction ───────────────────────────────────────────────────────────────

/** IHttpClient — the only type the executor service imports from this module. */
export interface IHttpClient {
  fetch(url: string, options: HttpFetchOptions): Promise<HttpFetchResult>
}

// ── Concrete implementation ───────────────────────────────────────────────────

export class UndiciHttpClient implements IHttpClient {
  private readonly dispatcher: Agent | undefined

  constructor() {
    this.dispatcher =
      process.env.ALLOW_INSECURE_TLS === 'true'
        ? new Agent({ connect: { rejectUnauthorized: false } })
        : undefined
  }

  async fetch(url: string, options: HttpFetchOptions): Promise<HttpFetchResult> {
    const signal = options.signal ?? AbortSignal.timeout(30_000)
    const { onRedirect } = options

    // For 301/302/303 redirects with non-safe methods, HTTP spec switches to GET.
    let currentUrl = url
    let currentMethod = options.method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentBody: any = NO_BODY_METHODS.has(options.method) ? undefined : ((options.body ?? undefined) as any)

    const doFetch = () => undiciFetch(currentUrl, {
      method: currentMethod,
      headers: options.headers,
      body: NO_BODY_METHODS.has(currentMethod) ? undefined : currentBody,
      redirect: 'manual', // never auto-follow — we validate each redirect hop
      signal,
      dispatcher: this.dispatcher,
    })

    let resp = await doFetch()

    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      // Not a redirect — we have the final response.
      if (resp.status < 300 || resp.status >= 400) break

      const location = resp.headers.get('location')
      if (!location) break // malformed redirect — return the 3xx as-is

      const locationUrl = new URL(location, currentUrl)

      // Validate the redirect destination through the SSRF guard before following.
      onRedirect?.(locationUrl)

      // 301/302/303 with non-safe methods: switch to GET and drop the body (HTTP spec §15.4).
      if ([301, 302, 303].includes(resp.status) && !NO_BODY_METHODS.has(currentMethod)) {
        currentMethod = 'GET'
        currentBody = undefined
      }

      currentUrl = locationUrl.toString()
      // Consume and discard the redirect body to free the connection.
      await resp.body?.cancel()
      resp = await doFetch()
    }

    const headers: Record<string, string> = {}
    resp.headers.forEach((value, key) => { headers[key] = value })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { body, byteLength } = await this.readBodyCapped(resp.body as any)

    return { status: resp.status, statusText: resp.statusText, headers, body, byteLength }
  }

  /**
   * Stream the response body up to MAX_BODY_BYTES, then cancel.
   * Pushes raw Uint8Array chunks to avoid intermediate Buffer allocations;
   * a single Buffer.concat at the end produces both the string and byte count.
   */
  private async readBodyCapped(
    stream: ReadableStream<Uint8Array> | null,
  ): Promise<{ body: string; byteLength: number }> {
    if (!stream) return { body: '', byteLength: 0 }

    const chunks: Uint8Array[] = []
    let totalBytes = 0
    let truncated = false
    const reader = stream.getReader()

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        totalBytes += value.length
        if (totalBytes > MAX_BODY_BYTES) {
          truncated = true
          await reader.cancel()
          break
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const buf = Buffer.concat(chunks)
    const text = buf.toString('utf8')
    // Use totalBytes (not buf.byteLength) so the reported size reflects how many
    // bytes the server actually sent — including the chunk that exceeded the cap
    // when truncated, buf.byteLength undercounts by up to one chunk's worth.
    const byteLength = truncated ? totalBytes : buf.byteLength

    return {
      body: truncated
        ? `${text}\n\n[Response truncated: exceeds ${MAX_BODY_BYTES / 1024 / 1024} MB limit]`
        : text,
      byteLength,
    }
  }
}
