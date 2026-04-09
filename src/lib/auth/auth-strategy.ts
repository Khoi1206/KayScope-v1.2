/**
 * Auth Strategy Pattern — resolves auth configuration into HTTP headers.
 *
 * Instead of if/else chains in the execute route, each auth type
 * has a dedicated strategy function. New auth types can be added
 * by registering a new entry in AUTH_STRATEGIES.
 */

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'api-key'
  token?: string
  username?: string
  password?: string
  apiKey?: string
  apiKeyHeader?: string
}

/** A strategy takes auth config + interpolate fn, returns header entries (or empty). */
type AuthStrategy = (
  auth: AuthConfig,
  interpolate: (str: string) => string,
) => Record<string, string>

/* ── Individual strategies ─────────────────────────────────── */

const noneStrategy: AuthStrategy = () => ({})

const bearerStrategy: AuthStrategy = (auth, interpolate): Record<string, string> => {
  if (!auth.token) return {}
  return { Authorization: `Bearer ${interpolate(auth.token)}` }
}

const basicStrategy: AuthStrategy = (auth, interpolate): Record<string, string> => {
  if (!auth.username) return {}
  const encoded = Buffer.from(
    `${interpolate(auth.username)}:${interpolate(auth.password ?? '')}`
  ).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

const apiKeyStrategy: AuthStrategy = (auth, interpolate): Record<string, string> => {
  if (!auth.apiKey) return {}
  const headerName = auth.apiKeyHeader ?? 'X-Api-Key'
  return { [headerName]: interpolate(auth.apiKey) }
}

/* ── Strategy registry ─────────────────────────────────────── */

const AUTH_STRATEGIES: Record<string, AuthStrategy> = {
  none: noneStrategy,
  bearer: bearerStrategy,
  basic: basicStrategy,
  'api-key': apiKeyStrategy,
}

/**
 * Resolve auth config into header entries using the registered strategy.
 *
 * @param auth - Auth configuration from the request
 * @param interpolate - Variable interpolation function ({{var}} → value)
 * @returns Record of headers to merge into the request
 */
export function resolveAuthHeaders(
  auth: AuthConfig | undefined,
  interpolate: (str: string) => string,
): Record<string, string> {
  if (!auth || auth.type === 'none') return {}
  const strategy = AUTH_STRATEGIES[auth.type]
  if (!strategy) return {}
  return strategy(auth, interpolate)
}
