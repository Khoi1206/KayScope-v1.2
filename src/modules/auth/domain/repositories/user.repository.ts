import type { CreateUserDTO, UpdateUserDTO, User } from '../entities/user.entity'

/**
 * IUserRepository — Contract (interface) for the data access layer.
 *
 * The domain layer only knows this interface, nothing about MongoDB.
 * The infrastructure layer implements this interface.
 */
export interface IUserRepository {
  /** Find a user by ID */
  findById(id: string): Promise<User | null>

  /** Fetch multiple users by ID in a single query (avoids N+1) */
  findByIds(ids: string[]): Promise<User[]>

  /** Find a user by email (used for login) */
  findByEmail(email: string): Promise<User | null>

  /**
   * Find a user by OAuth provider.
   * Used when signing in via Google/GitHub.
   */
  findByProvider(provider: string, providerId: string): Promise<User | null>

  /** Create a new user */
  create(data: CreateUserDTO): Promise<User>

  /** Update user information */
  update(id: string, data: UpdateUserDTO): Promise<User | null>

  /** Delete a user */
  delete(id: string): Promise<boolean>
}
