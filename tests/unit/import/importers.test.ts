import { describe, it, expect } from 'vitest'
import { KayScopeImporter } from '@/lib/import/kayscope-importer'
import { PostmanImporter } from '@/lib/import/postman-importer'
import { OpenApiImporter } from '@/lib/import/openapi-importer'

// ── KayScopeImporter.detect() ─────────────────────────────────────────────────

describe('KayScopeImporter.detect()', () => {
  const importer = new KayScopeImporter()

  it('returns true when _type is kayscope_collection', () => {
    expect(importer.detect({ _type: 'kayscope_collection', collection: {}, requests: [] })).toBe(true)
  })

  it('returns false when _type is wrong', () => {
    expect(importer.detect({ _type: 'postman', info: {}, item: [] })).toBe(false)
  })

  it('returns false when _type is missing', () => {
    expect(importer.detect({ collection: {}, requests: [] })).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(importer.detect({})).toBe(false)
  })
})

// ── PostmanImporter.detect() ──────────────────────────────────────────────────

describe('PostmanImporter.detect()', () => {
  const importer = new PostmanImporter()

  it('returns true when both info and item are present', () => {
    expect(importer.detect({ info: { name: 'My Collection' }, item: [] })).toBe(true)
  })

  it('returns false when info is missing', () => {
    expect(importer.detect({ item: [] })).toBe(false)
  })

  it('returns false when item is missing', () => {
    expect(importer.detect({ info: { name: 'My Collection' } })).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(importer.detect({})).toBe(false)
  })
})

// ── OpenApiImporter.detect() ──────────────────────────────────────────────────

describe('OpenApiImporter.detect()', () => {
  const importer = new OpenApiImporter()

  it('returns true for a valid OpenAPI 3.0.x document', () => {
    expect(importer.detect({ openapi: '3.0.3', info: { title: 'Test' }, paths: {} })).toBe(true)
  })

  it('returns true for OpenAPI 3.1.x', () => {
    expect(importer.detect({ openapi: '3.1.0', info: {}, paths: {} })).toBe(true)
  })

  it('returns false for Swagger 2.x (no openapi field)', () => {
    expect(importer.detect({ swagger: '2.0', info: {}, paths: {} })).toBe(false)
  })

  it('returns false when openapi field does not start with 3.', () => {
    expect(importer.detect({ openapi: '2.0', info: {}, paths: {} })).toBe(false)
  })

  it('returns false when paths is missing', () => {
    expect(importer.detect({ openapi: '3.0.3', info: {} })).toBe(false)
  })

  it('returns false for an empty object', () => {
    expect(importer.detect({})).toBe(false)
  })

  // No format should be detected as multiple formats simultaneously
  it('is not detected as a Postman collection', () => {
    const postmanImporter = new PostmanImporter()
    const openApiDoc = { openapi: '3.0.3', info: { title: 'Test' }, paths: {} }
    expect(importer.detect(openApiDoc)).toBe(true)
    expect(postmanImporter.detect(openApiDoc)).toBe(false)
  })
})
