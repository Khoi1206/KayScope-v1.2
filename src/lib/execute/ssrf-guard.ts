/**
 * ssrf-guard.ts — SRP + OCP
 *
 * Single responsibility: validate that a target URL is safe to proxy.
 * OCP: extend BLOCKED_HOSTNAMES or the range checks without touching any route.
 */

import { ValidationError } from '@/lib/errors/ValidationError'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0',  // loopback / bind-all
  '169.254.169.254', '169.254.170.2',                     // AWS / Azure IMDS
  'metadata.google.internal', 'metadata.internal',        // GCP / named endpoints
])

// Compiled once — matched against every outbound host.
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/** ISsrfGuard — injectible abstraction; swap in a no-op stub during tests. */
export interface ISsrfGuard {
  validate(url: URL): void
}

/**
 * SsrfGuard — blocks dangerous URL schemes, reserved hostnames, and private IP ranges.
 * Inlined into a single `validate` call to minimise stack depth on the hot path.
 */
export class SsrfGuard implements ISsrfGuard {
  validate(url: URL): void {
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      throw new ValidationError(`URL scheme "${url.protocol}" is not allowed`)
    }

    const host = url.hostname.toLowerCase()

    if (BLOCKED_HOSTNAMES.has(host)) {
      throw new ValidationError('Requests to restricted addresses are not allowed')
    }

    const oct = IPV4_RE.exec(host)
    if (oct) {
      const [a, b] = [Number(oct[1]), Number(oct[2])]
      if (
        a === 10 ||                           // 10.0.0.0/8     RFC-1918
        (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12  RFC-1918
        (a === 192 && b === 168) ||           // 192.168.0.0/16 RFC-1918
        (a === 100 && b >= 64 && b <= 127)    // 100.64.0.0/10  CGNAT RFC-6598
      ) {
        throw new ValidationError('Requests to private IP ranges are not allowed')
      }
    }
  }
}
