import { AppError } from './AppError'

/** Error for invalid input data */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>

  constructor(
    message: string = 'Invalid data',
    fields?: Record<string, string>
  ) {
    super(message, 422)
    this.fields = fields
  }
}

/** Resource not found */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

/** Conflict error (e.g. name already exists) */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409)
  }
}
