'use server'

import { AppError } from '@/lib/errors'
import logger from '@/lib/logger'
import { registerBodySchema } from '@/lib/schemas'
import { createUserRepository } from '@/lib/db/repository-factory'
import { RegisterUseCase } from '@/modules/auth/domain/usecases/register.usecase'

export interface ActionState {
  success: boolean
  message?: string
  fields?: Record<string, string>
}

/**
 * registerAction — Server Action for the registration form.
 * Calls RegisterUseCase directly, avoiding a loopback HTTP round-trip.
 * Rate limiting for direct API usage is still enforced by POST /api/auth/register.
 */
export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validate confirm password at the presentation layer
  if (password !== confirmPassword) {
    return {
      success: false,
      fields: { confirmPassword: 'Passwords do not match' },
    }
  }

  try {
    const parsed = registerBodySchema.safeParse({ name, email, password })
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message }
    }

    const userRepository = createUserRepository()
    const registerUseCase = new RegisterUseCase(userRepository)
    await registerUseCase.execute(parsed.data)

    return {
      success: true,
      message: 'Registration successful! Redirecting...',
    }
  } catch (error) {
    if (error instanceof AppError) {
      const withFields = error as AppError & { fields?: Record<string, string> }
      return { success: false, message: error.message, fields: withFields.fields }
    }
    logger.error({ error }, '[registerAction] Unexpected error')
    return { success: false, message: 'An unexpected error occurred, please try again' }
  }
}
