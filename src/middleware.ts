import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'

/**
 * Route protection middleware — uses NextAuth v5's split-config pattern.
 *
 * auth.config.ts is edge-compatible (no Node.js APIs), so it can run
 * in the Edge Runtime used by Next.js middleware.
 *
 * The authorized() callback in authConfig returns !!auth (session present).
 * If not authorized → redirect to authConfig.pages.signIn (/login).
 *
 * Public routes (no protection needed):
 * - /login, /register — auth pages
 * - /api/auth/* — NextAuth handlers
 * - /_next/*, /favicon.ico — static assets
 */
export default NextAuth(authConfig).auth

/**
 * Matcher — Apply middleware only to routes that require protection.
 *
 * Excludes:
 * - /login, /register (public auth pages)
 * - /api/auth/* (NextAuth API)
 * - Static files (_next, favicon...)
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/test-builder/:path*',
    '/test-builder',
    '/api/playwright/:path*',
    '/workspace/:path*',
    '/api/workspaces/:path*',
    '/api/collections/:path*',
    '/api/requests/:path*',
    '/api/environments/:path*',
    '/api/execute',
    '/api/history',
    '/api/export',
    '/api/folders',
    '/api/folders/:path*',
    '/api/import',
    '/api/test-runs',
    '/api/test-runs/:path*',
    '/api/user/:path*',
  ],
}
