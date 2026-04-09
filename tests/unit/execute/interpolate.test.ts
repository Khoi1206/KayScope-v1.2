import { describe, it, expect } from 'vitest'
import { interpolate, buildUrl, buildHeaders } from '@/lib/execute/interpolate'

describe('interpolate()', () => {
  it('fast-path: returns the same reference when no braces', () => {
    const str = 'hello world'
    expect(interpolate(str, {}, {})).toBe(str)
  })

  it('resolves {envVar} single-brace syntax', () => {
    expect(interpolate('Hello {name}!', { name: 'World' }, {})).toBe('Hello World!')
  })

  it('resolves {{tempVar}} double-brace syntax', () => {
    expect(interpolate('token={{token}}', {}, { token: 'abc123' })).toBe('token=abc123')
  })

  it('temp vars take precedence over env vars for double-brace', () => {
    expect(interpolate('{{x}}', { x: 'env' }, { x: 'temp' })).toBe('temp')
  })

  it('env var is NOT used for double-brace ({{}} is temp only)', () => {
    expect(interpolate('{{missing}}', { missing: 'env' }, {})).toBe('{{missing}}')
  })

  it('leaves unknown {var} unchanged', () => {
    expect(interpolate('{missing}', {}, {})).toBe('{missing}')
  })

  it('resolves multiple placeholders in one string', () => {
    expect(
      interpolate('{base}/users/{{userId}}', { base: 'https://api.example.com' }, { userId: '42' }),
    ).toBe('https://api.example.com/users/42')
  })

  it('does not resolve {var} when env key is absent', () => {
    expect(interpolate('{a} {b}', { a: 'A' }, {})).toBe('A {b}')
  })
})

describe('buildUrl()', () => {
  it('builds a URL with params', () => {
    const url = buildUrl('https://example.com', [{ key: 'q', value: 'test', enabled: true }], {}, {})
    expect(url.toString()).toBe('https://example.com/?q=test')
  })

  it('strips the inline query string from rawUrl', () => {
    const url = buildUrl('https://example.com?old=1', [{ key: 'new', value: '2', enabled: true }], {}, {})
    expect(url.searchParams.has('old')).toBe(false)
    expect(url.searchParams.get('new')).toBe('2')
  })

  it('prepends https when no scheme is given', () => {
    const url = buildUrl('example.com/path', [], {}, {})
    expect(url.protocol).toBe('https:')
  })

  it('skips disabled params', () => {
    const url = buildUrl('https://example.com', [{ key: 'skip', value: 'me', enabled: false }], {}, {})
    expect(url.searchParams.has('skip')).toBe(false)
  })

  it('interpolates variables in params', () => {
    const url = buildUrl('https://example.com', [{ key: 'v', value: '{ver}', enabled: true }], { ver: '2' }, {})
    expect(url.searchParams.get('v')).toBe('2')
  })

  it('throws on a completely invalid URL', () => {
    expect(() => buildUrl('not a url !!!', [], {}, {})).toThrow()
  })
})

describe('buildHeaders()', () => {
  it('converts enabled KV pairs to header object', () => {
    const headers = buildHeaders(
      [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Skip', value: 'no', enabled: false },
      ],
      {},
      {},
    )
    expect(headers['Content-Type']).toBe('application/json')
    expect('X-Skip' in headers).toBe(false)
  })

  it('interpolates variables in header values', () => {
    const headers = buildHeaders(
      [{ key: 'Authorization', value: 'Bearer {token}', enabled: true }],
      { token: 'secret' },
      {},
    )
    expect(headers['Authorization']).toBe('Bearer secret')
  })
})
