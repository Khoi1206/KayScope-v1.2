import bcrypt from 'bcryptjs'
import { EmailAlreadyExistsError } from '@/lib/errors'
import { ValidationError } from '@/lib/errors'
import type { IUserRepository } from '../repositories/user.repository'
import type { CreateUserDTO, UserSession } from '../entities/user.entity'

/**
 * RegisterUseCase — Business logic for registering a new account.
 *
 * Dependency Rule: the use case depends only on IUserRepository (interface),
 * and knows nothing about MongoDB or HTTP.
 */
export class RegisterUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: CreateUserDTO): Promise<UserSession> {
    // 1. Validate input
    this.validate(dto)

    // 2. Check if email already exists
    const existingUser = await this.userRepository.findByEmail(dto.email)
    if (existingUser) {
      throw new EmailAlreadyExistsError()
    }

    // 3. Hash password before saving (cost factor = 12)
    const hashedPassword = await bcrypt.hash(dto.password, 12)

    // 4. Create the new user
    const newUser = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    })

    // 5. Return UserSession (excludes password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...session } = newUser
    return session
  }

  private validate(dto: CreateUserDTO): void {
    const fields: Record<string, string> = {}

    if (!dto.name || dto.name.trim().length < 2) {
      fields.name = 'Name must be at least 2 characters'
    }

    if (!dto.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      fields.email = 'Invalid email address'
    }

    if (!dto.password || dto.password.length < 8) {
      fields.password = 'Password must be at least 8 characters'
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError('Invalid registration data', fields)
    }
  }
}
