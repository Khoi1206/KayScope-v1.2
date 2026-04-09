import { NextRequest, NextResponse } from 'next/server'
import { createUserRepository } from '@/lib/db/repository-factory'
import { RegisterUseCase } from '@/modules/auth/domain/usecases/register.usecase'
import { AppError } from '@/lib/errors'
import { registerBodySchema } from '@/lib/schemas'
import logger from '@/lib/logger'
import { createRateLimiter } from '@/lib/api/rate-limiter'
import { getClientIp } from '@/lib/api/http-utils'

// 5 registration attempts per 15 minutes per IP
const rateLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 })

/**
 * POST /api/auth/register
 * Register a new account via email/password.
 */
export async function POST(request: NextRequest) {
  if (!await rateLimiter.check(getClientIp(request))) {
    return NextResponse.json(
      { success: false, message: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const raw = await request.json()
    const parsed = registerBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { name, email, password } = parsed.data

    // Initialize dependencies (manual DI)
    const userRepository = createUserRepository()
    const registerUseCase = new RegisterUseCase(userRepository)

    const user = await registerUseCase.execute({ name, email, password })

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    // Handle AppErrors (operational errors)
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          // Include field errors if it is a ValidationError
          ...(('fields' in error) && { fields: (error as { fields?: unknown }).fields }),
        },
        { status: error.statusCode }
      )
    }

    // Unknown error — log on the server, return 500
    logger.error({ error }, '[POST /api/auth/register] Unexpected error')
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred, please try again' },
      { status: 500 }
    )
  }
}
