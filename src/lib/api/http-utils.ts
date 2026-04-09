/**
 * General HTTP utility helpers for Next.js API routes.
 *
 * Kept separate from rate-limiter.ts so callers that only need IP extraction
 * are not forced to import the rate-limiting module (ISP / SRP).
 */

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  // x-forwarded-for may contain a comma-separated list; first value is the original client.
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
