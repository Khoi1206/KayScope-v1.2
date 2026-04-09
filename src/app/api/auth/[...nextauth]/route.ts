import { handlers } from '@/lib/auth/auth'

/**
 * NextAuth v5 handler for App Router.
 * Handles all requests to /api/auth/* (signin, signout, session, csrf...)
 */
export const { GET, POST } = handlers
