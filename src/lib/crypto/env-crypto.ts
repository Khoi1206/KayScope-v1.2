import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm' as const
const ENC_PREFIX = 'enc:'

function getKey(): Buffer {
  const raw = process.env.ENV_SECRET_KEY
  if (!raw) {
    throw new Error(
      'ENV_SECRET_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) {
    throw new Error(
      'ENV_SECRET_KEY must decode to exactly 32 bytes (provide a 64-character hex string).'
    )
  }
  return buf
}

export function isEncrypted(val: string): boolean {
  return val.startsWith(ENC_PREFIX)
}

export function encryptValue(plain: string): string {
  if (!plain) return plain
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('hex')}:${ciphertext.toString('hex')}:${tag.toString('hex')}`
}

export function decryptValue(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored // legacy plaintext passthrough

  const inner = stored.slice(ENC_PREFIX.length)
  const parts = inner.split(':')
  if (parts.length !== 3) return '' // malformed — fail safe

  const [ivHex, ciphertextHex, tagHex] = parts
  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const ciphertext = Buffer.from(ciphertextHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
  } catch {
    return ''
  }
}
