import { describe, it, expect, vi } from 'vitest'
import { RequestExecutorService } from '@/lib/execute/request-executor.service'
import type { IHttpClient, HttpFetchOptions, HttpFetchResult } from '@/lib/execute/http-client'
import type { ISsrfGuard } from '@/lib/execute/ssrf-guard'
import { ValidationError } from '@/lib/errors/ValidationError'

// ── Test doubles ──────────────────────────────────────────────────────────────

function makeClient(overrides?: Partial<IHttpClient>): IHttpClient {
  return {
    fetch: vi.fn<(url: string, opts: HttpFetchOptions) => Promise<HttpFetchResult>>().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      byteLength: 11,
    }),
    ...overrides,
  }
}

function makeGuard(throws = false): ISsrfGuard {
  return {
    validate: throws
      ? vi.fn().mockImplementation(() => { throw new ValidationError('SSRF blocked') })
      : vi.fn(),
  }
}

const baseInput = {
  dto: { url: 'https://example.com', method: 'GET' as const },
  envVars: {} as Record<string, string>,
  tempVars: {} as Record<string, string>,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RequestExecutorService.execute()', () => {
  it('calls httpClient.fetch with the resolved URL', async () => {
    const client = makeClient()
    const svc = new RequestExecutorService(client, makeGuard())

    await svc.execute(baseInput)

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('example.com'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns the HTTP response fields verbatim', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { result } = await svc.execute(baseInput)

    expect(result.status).toBe(200)
    expect(result.statusText).toBe('OK')
    expect(result.body).toBe('{"ok":true}')
  })

  it('maps fetched.byteLength → result.size (no re-encode pass)', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { result } = await svc.execute(baseInput)

    expect(result.size).toBe(11)
  })

  it('returns status-0 Network Error on fetch rejection', async () => {
    const client = makeClient({
      fetch: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    })
    const svc = new RequestExecutorService(client, makeGuard())

    const { result } = await svc.execute(baseInput)

    expect(result.status).toBe(0)
    expect(result.statusText).toBe('Network Error')
    expect(result.size).toBe(0)
  })

  it('includes the error message in the body for Network Error', async () => {
    const client = makeClient({
      fetch: vi.fn().mockRejectedValue(new Error('timeout')),
    })
    const svc = new RequestExecutorService(client, makeGuard())

    const { result } = await svc.execute(baseInput)

    expect(result.body).toContain('timeout')
  })

  it('throws ValidationError when SSRF guard rejects', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard(true))

    await expect(
      svc.execute({ ...baseInput, dto: { url: 'http://localhost', method: 'GET' } }),
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for a completely invalid URL', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())

    await expect(
      svc.execute({ ...baseInput, dto: { url: 'not a url !!!', method: 'GET' } }),
    ).rejects.toThrow(ValidationError)
  })

  it('interpolates {envVar} into the URL', async () => {
    const client = makeClient()
    const svc = new RequestExecutorService(client, makeGuard())

    await svc.execute({
      dto: { url: 'https://{host}/path', method: 'GET' },
      envVars: { host: 'api.example.com' },
      tempVars: {},
    })

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.example.com'),
      expect.anything(),
    )
  })

  it('interpolates {{tempVar}} into the URL', async () => {
    const client = makeClient()
    const svc = new RequestExecutorService(client, makeGuard())

    await svc.execute({
      dto: { url: 'https://example.com/{{version}}/data', method: 'GET' },
      envVars: {},
      tempVars: { version: 'v2' },
    })

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v2/data'),
      expect.anything(),
    )
  })

  it('returns targetUrl as a string', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { targetUrl } = await svc.execute(baseInput)

    expect(typeof targetUrl).toBe('string')
    expect(targetUrl).toContain('example.com')
  })

  it('returns requestHeaders as a plain object', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { requestHeaders } = await svc.execute({
      ...baseInput,
      dto: {
        url: 'https://example.com',
        method: 'POST',
        headers: [{ key: 'X-Custom', value: 'test', enabled: true }],
      },
    })

    expect(requestHeaders['X-Custom']).toBe('test')
  })

  it('exposes requestBody for JSON body', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { requestBody } = await svc.execute({
      dto: {
        url: 'https://example.com',
        method: 'POST',
        body: { type: 'json', content: '{"key":"value"}' },
      },
      envVars: {},
      tempVars: {},
    })

    expect(requestBody).toContain('"key"')
  })

  it('sets requestBody to undefined when there is no body', async () => {
    const svc = new RequestExecutorService(makeClient(), makeGuard())
    const { requestBody } = await svc.execute(baseInput)

    expect(requestBody).toBeUndefined()
  })

  it('calls ssrfGuard.validate with a URL instance', async () => {
    const guard = makeGuard()
    const svc = new RequestExecutorService(makeClient(), guard)
    await svc.execute(baseInput)

    expect(guard.validate).toHaveBeenCalledWith(expect.any(URL))
  })
})
