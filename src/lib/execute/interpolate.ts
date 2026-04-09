/**
 * interpolate.ts — SRP
 *
 * Pure functions for variable interpolation and building URLs/headers from KV pairs.
 * No I/O, no side effects — trivially unit-testable.
 *
 * Syntax:
 *  {{tempVar}}  — resolved from tempVars (overrides / session)
 *  {envVar}     — resolved from envVars (environment)
 */

import type { KeyValuePair } from '@/modules/request/domain/entities/request.entity'

// Compiled once at module load — safe to share because String.prototype.replace
// always resets lastIndex before each invocation.
const INTERP_RE = /\{\{(\w+)\}\}|(?<!\{)\{(\w+)\}(?!\})/g

/** Replace {{tempVar}} and {envVar} placeholders with their resolved values. */
export function interpolate(
  str: string,
  env: Record<string, string>,
  temp: Record<string, string>,
): string {
  // Fast path: skip regex entirely when the string contains no variable syntax.
  if (!str.includes('{')) return str
  return str.replace(INTERP_RE, (match, doubleVar, singleVar) => {
    if (doubleVar !== undefined) return temp[doubleVar] ?? match
    return singleVar !== undefined && singleVar in env ? env[singleVar] : match
  })
}

/**
 * Build the final URL by resolving variable placeholders in rawUrl and params.
 * The inline query string in rawUrl is stripped so the params KV table is the
 * single source of truth — prevents duplicates when the URL bar still contains
 * a ?... string that was previously synced into the params editor.
 */
export function buildUrl(
  rawUrl: string,
  params: KeyValuePair[],
  env: Record<string, string>,
  temp: Record<string, string>,
): URL {
  const resolved = interpolate(rawUrl.trim(), env, temp)
  const qIdx = resolved.indexOf('?')
  const base = qIdx === -1 ? resolved : resolved.slice(0, qIdx)
  const url = new URL(base.startsWith('http') ? base : `https://${base}`)
  for (const p of params) {
    if (p.enabled && p.key) {
      url.searchParams.append(interpolate(p.key, env, temp), interpolate(p.value, env, temp))
    }
  }
  return url
}

/** Convert enabled KeyValuePairs into a plain headers object, resolving variables. */
export function buildHeaders(
  rawHeaders: KeyValuePair[],
  env: Record<string, string>,
  temp: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of rawHeaders) {
    if (h.enabled && h.key) {
      out[interpolate(h.key, env, temp)] = interpolate(h.value, env, temp)
    }
  }
  return out
}
