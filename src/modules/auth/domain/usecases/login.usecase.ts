import bcrypt from 'bcryptjs'
import { InvalidCredentialsError } from '@/lib/errors'
import type { IUserRepository } from '../repositories/user.repository'
import type { UserSession } from '../entities/user.entity'

export interface LoginDTO {
  email: string
  password: string
}

/**
 * LoginUseCase — Business logic for signing in via email/password.
 *
 * Called from NextAuth's CredentialsProvider.authorize();
 * does not depend on NextAuth or the HTTP layer.
 */
export class LoginUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: LoginDTO): Promise<UserSession> {
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(dto.email)
    if (!user) {
      // Return a generic error to prevent user enumeration attacks
      throw new InvalidCredentialsError()
    }

    // 2. Ensure the user has a password (may have signed in via OAuth)
    if (!user.password) {
      throw new InvalidCredentialsError(
        'This account was created via social login, please use that method instead'
      )
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password)
    if (!isPasswordValid) {
      throw new InvalidCredentialsError()
    }

    // 4. Return session data (no password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...session } = user
    return session
  }
}
