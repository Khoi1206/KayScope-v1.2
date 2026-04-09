import 'next-auth'
import 'next-auth/jwt'
import type { DefaultSession } from 'next-auth'

/**
 * Extend NextAuth v5 types so TypeScript understands
 * that session.user.id and token.id exist.
 *
 * Module augmentation — generates no runtime code.
 */
declare module 'next-auth' {
  interface User {
    id?: string
  }

  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
