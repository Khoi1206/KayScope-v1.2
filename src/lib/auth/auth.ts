import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { createUserRepository } from '@/lib/db/repository-factory'
import { LoginUseCase } from '@/modules/auth/domain/usecases/login.usecase'

/**
 * Full NextAuth v5 config — Node.js only (not edge-compatible).
 *
 * Spreads the edge-safe authConfig and adds the Credentials provider
 * which requires MongoDB (a Node.js-only module).
 *
 * Exports:
 *  - handlers → used by /api/auth/[...nextauth]/route.ts
 *  - auth     → used by server components and API route helpers (replaces getServerSession)
 *  - signIn / signOut → server actions
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const userRepository = createUserRepository()
          const loginUseCase = new LoginUseCase(userRepository)
          const user = await loginUseCase.execute({
            email: credentials.email as string,
            password: credentials.password as string,
          })
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatar ?? null,
          }
        } catch {
          // authorize must return null on failure (do not throw)
          return null
        }
      },
    }),
  ],

  // Required in production — use a long random string in .env.local
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug logs in development
  debug: process.env.NODE_ENV === 'development',
})
