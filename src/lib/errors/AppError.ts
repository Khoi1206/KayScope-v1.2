/**
 * Base error class for the entire application.
 * All custom errors extend from this class.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Capture stack trace accurately (skip this constructor frame)
    Error.captureStackTrace(this, this.constructor)
  }
}
