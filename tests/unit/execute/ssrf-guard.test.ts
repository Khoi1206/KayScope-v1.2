import { describe, it, expect } from 'vitest'
import { SsrfGuard } from '@/lib/execute/ssrf-guard'
import { ValidationError } from '@/lib/errors/ValidationError'

const guard = new SsrfGuard()
const url = (s: string) => new URL(s)

describe('SsrfGuard.validate()', () => {
  // ── Allowed ─────────────────────────────────────────────────────────────────
  it('allows a normal public HTTPS URL', () => {
    expect(() => guard.validate(url('https://api.example.com/data'))).not.toThrow()
  })

  it('allows a plain HTTP public URL', () => {
    expect(() => guard.validate(url('http://example.com'))).not.toThrow()
  })

  it('allows a public IP address', () => {
    expect(() => guard.validate(url('https://8.8.8.8'))).not.toThrow()
  })

  // ── Blocked protocols ────────────────────────────────────────────────────────
  it('blocks file: protocol', () => {
    expect(() => guard.validate(url('file:///etc/passwd'))).toThrow(ValidationError)
  })

  it('blocks ftp: protocol', () => {
    expect(() => guard.validate(url('ftp://files.example.com'))).toThrow(ValidationError)
  })

  // ── Blocked hostnames ────────────────────────────────────────────────────────
  it('blocks localhost', () => {
    expect(() => guard.validate(url('http://localhost'))).toThrow(ValidationError)
  })

  it('blocks localhost with port', () => {
    expect(() => guard.validate(url('http://localhost:3000'))).toThrow(ValidationError)
  })

  it('blocks 127.0.0.1', () => {
    expect(() => guard.validate(url('http://127.0.0.1'))).toThrow(ValidationError)
  })

  it('blocks 0.0.0.0', () => {
    expect(() => guard.validate(url('http://0.0.0.0'))).toThrow(ValidationError)
  })

  it('blocks IPv6 loopback ::1', () => {
    expect(() => guard.validate(url('http://[::1]'))).toThrow(ValidationError)
  })

  it('blocks AWS IMDS 169.254.169.254', () => {
    expect(() => guard.validate(url('http://169.254.169.254/latest/meta-data'))).toThrow(ValidationError)
  })

  it('blocks Azure IMDS 169.254.170.2', () => {
    expect(() => guard.validate(url('http://169.254.170.2'))).toThrow(ValidationError)
  })

  it('blocks GCP metadata.google.internal', () => {
    expect(() => guard.validate(url('http://metadata.google.internal'))).toThrow(ValidationError)
  })

  it('blocks metadata.internal', () => {
    expect(() => guard.validate(url('http://metadata.internal'))).toThrow(ValidationError)
  })

  // ── Blocked IP ranges ────────────────────────────────────────────────────────
  it('blocks RFC-1918 10.x.x.x', () => {
    expect(() => guard.validate(url('http://10.0.0.1'))).toThrow(ValidationError)
  })

  it('blocks RFC-1918 10.255.255.255', () => {
    expect(() => guard.validate(url('http://10.255.255.255'))).toThrow(ValidationError)
  })

  it('blocks RFC-1918 172.16.0.1', () => {
    expect(() => guard.validate(url('http://172.16.0.1'))).toThrow(ValidationError)
  })

  it('blocks RFC-1918 172.31.255.255', () => {
    expect(() => guard.validate(url('http://172.31.255.255'))).toThrow(ValidationError)
  })

  it('allows public 172.15.x.x (just outside RFC-1918)', () => {
    expect(() => guard.validate(url('http://172.15.0.1'))).not.toThrow()
  })

  it('allows public 172.32.x.x (just outside RFC-1918)', () => {
    expect(() => guard.validate(url('http://172.32.0.1'))).not.toThrow()
  })

  it('blocks RFC-1918 192.168.x.x', () => {
    expect(() => guard.validate(url('http://192.168.1.1'))).toThrow(ValidationError)
  })

  it('blocks CGNAT 100.64.0.0 (RFC-6598)', () => {
    expect(() => guard.validate(url('http://100.64.0.0'))).toThrow(ValidationError)
  })

  it('blocks CGNAT 100.127.255.255 (RFC-6598 last address)', () => {
    expect(() => guard.validate(url('http://100.127.255.255'))).toThrow(ValidationError)
  })

  it('allows 100.128.x.x (just outside CGNAT)', () => {
    expect(() => guard.validate(url('http://100.128.0.1'))).not.toThrow()
  })
})
