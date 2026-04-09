import { auth } from './auth'
import { UnauthenticatedError } from '@/lib/errors'
import type { Session } from 'next-auth'

/**
 * requireSession — Retrieves session via NextAuth v5 auth() and throws if unauthenticated.
 * Use in protected API route handlers.
 *
 * ```ts
 * const session = await requireSession()
 * const userId = session.user.id
 * ```
 */
export async function requireSession(): Promise<Session> {
  const session = await auth()
  if (!session) {
    throw new UnauthenticatedError()
  }
  return session
}
