import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { encryptValue, decryptValue, isEncrypted } from '@/lib/crypto/env-crypto'

// Use a deterministic 64-char hex key for the test suite
const TEST_KEY = 'a'.repeat(64) // 32 bytes of 0xAA — valid AES-256 key

beforeAll(() => {
  process.env.ENV_SECRET_KEY = TEST_KEY
})

afterAll(() => {
  delete process.env.ENV_SECRET_KEY
})

describe('encryptValue / decryptValue — roundtrip', () => {
  it('decrypts back to the original plaintext', () => {
    const plain = 'my-secret-api-key'
    expect(decryptValue(encryptValue(plain))).toBe(plain)
  })

  it('handles unicode / special characters', () => {
    const plain = '🔑 Pässwörd with <special> "chars" & symbols!'
    expect(decryptValue(encryptValue(plain))).toBe(plain)
  })

  it('handles an empty string — returns it unchanged (no-op)', () => {
    // encryptValue('') returns '' (early return)
    expect(encryptValue('')).toBe('')
    // decryptValue('') has no enc: prefix — plaintext passthrough
    expect(decryptValue('')).toBe('')
  })

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plain = 'same-input'
    const enc1 = encryptValue(plain)
    const enc2 = encryptValue(plain)
    expect(enc1).not.toBe(enc2)
  })
})

describe('isEncrypted()', () => {
  it('returns true for an encrypted value', () => {
    expect(isEncrypted(encryptValue('hello'))).toBe(true)
  })

  it('returns false for a plaintext value', () => {
    expect(isEncrypted('plaintext')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false)
  })
})

describe('decryptValue — passthrough and error cases', () => {
  it('returns plaintext as-is when it has no enc: prefix (legacy compat)', () => {
    expect(decryptValue('plain-old-value')).toBe('plain-old-value')
  })

  it('returns empty string for malformed enc: payload (wrong segment count)', () => {
    expect(decryptValue('enc:onlyone')).toBe('')
    expect(decryptValue('enc:a:b:c:d')).toBe('') // four segments
  })

  it('returns empty string when auth tag is tampered (GCM integrity check)', () => {
    const enc = encryptValue('sensitive')
    // The format is enc:<iv_hex>:<ciphertext_hex>:<tag_hex>
    // Flip the last byte of the auth tag (last 2 hex chars)
    const parts = enc.split(':')
    const tag = parts[3]
    const tampered = tag.slice(0, -2) + (tag.endsWith('ff') ? '00' : 'ff')
    const tamperedEnc = [...parts.slice(0, 3), tampered].join(':')
    expect(decryptValue(tamperedEnc)).toBe('')
  })

  it('returns empty string when ciphertext is tampered', () => {
    const enc = encryptValue('sensitive')
    const parts = enc.split(':')
    const ciphertext = parts[2]
    const tampered = ciphertext.slice(0, -2) + (ciphertext.endsWith('ff') ? '00' : 'ff')
    const tamperedEnc = [parts[0], parts[1], tampered, parts[3]].join(':')
    expect(decryptValue(tamperedEnc)).toBe('')
  })

  it('returns empty string when IV is tampered', () => {
    const enc = encryptValue('sensitive')
    const parts = enc.split(':')
    const iv = parts[1]
    const tampered = (iv[0] === '0' ? '1' : '0') + iv.slice(1)
    const tamperedEnc = [parts[0], tampered, parts[2], parts[3]].join(':')
    expect(decryptValue(tamperedEnc)).toBe('')
  })
})

describe('getKey() validation', () => {
  it('throws when ENV_SECRET_KEY is missing', () => {
    const saved = process.env.ENV_SECRET_KEY
    delete process.env.ENV_SECRET_KEY
    expect(() => encryptValue('test')).toThrow('ENV_SECRET_KEY is not set')
    process.env.ENV_SECRET_KEY = saved
  })

  it('throws when ENV_SECRET_KEY decodes to wrong length', () => {
    const saved = process.env.ENV_SECRET_KEY
    process.env.ENV_SECRET_KEY = 'deadbeef' // only 4 bytes
    expect(() => encryptValue('test')).toThrow('32 bytes')
    process.env.ENV_SECRET_KEY = saved
  })
})
