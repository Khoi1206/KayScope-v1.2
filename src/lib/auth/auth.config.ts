import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-compatible NextAuth v5 config.
 *
 * This file must NOT import Node.js-only modules (mongodb, bcrypt, etc.)
 * because it is imported by the middleware which runs on the Edge Runtime.
 *
 * The full config (with Credentials provider + MongoDB) lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * authorized: gate every route in the middleware matcher.
     * Return true to allow, false to redirect to signIn page.
     */
    authorized({ auth }) {
      return !!auth
    },

    /**
     * jwt: persist user.id in the token on first sign-in.
     */
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },

    /**
     * session: expose token.id in session.user for client / server code.
     */
    async session({ session, token }) {
      if (token && session.user) session.user.id = token.id as string
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Providers added in auth.ts (Node.js only)
  providers: [],
}
