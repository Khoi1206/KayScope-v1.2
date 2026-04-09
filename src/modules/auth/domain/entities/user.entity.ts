/**
 * User Entity — Pure domain object, independent of any framework.
 * Defines the data shape and business rules for the auth feature.
 */
export interface User {
  id: string
  name: string
  email: string
  /** undefined if the user signed in via OAuth */
  password?: string
  avatar?: string
  /** 'credentials' | 'google' | 'github' */
  provider: string
  providerId?: string
  createdAt: Date
  updatedAt: Date
}

/** Data required to create a new user via credentials */
export interface CreateUserDTO {
  name: string
  email: string
  password: string
}

/** Session payload returned after login — excludes password */
export type UserSession = Omit<User, 'password'>

/** Profile update payload */
export interface UpdateUserDTO {
  name?: string
  avatar?: string
  password?: string
}
