import { AppError } from './AppError'

/**
 * Base class for all authentication/authorization errors.
 */
export class AuthError extends AppError {
  constructor(message: string = 'Access denied', statusCode = 401) {
    super(message, statusCode)
  }
}

/** User is not authenticated (HTTP 401). */
export class UnauthenticatedError extends AuthError {
  constructor(message: string = 'You are not logged in') {
    super(message, 401)
  }
}

/** User does not have permission to perform this action (HTTP 403). */
export class UnauthorizedError extends AuthError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403)
  }
}

/** Invalid email or password (HTTP 401). */
export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid email or password') {
    super(message, 401)
  }
}

/** Email is already registered (HTTP 409). */
export class EmailAlreadyExistsError extends AppError {
  constructor(message: string = 'This email is already registered') {
    super(message, 409)
  }
}
