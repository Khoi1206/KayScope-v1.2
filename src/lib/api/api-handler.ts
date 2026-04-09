import { NextResponse } from 'next/server'
import { AppError } from '../errors/AppError'
import logger from '../logger'

/** Wraps a route handler and converts AppError / unknown errors into JSON responses. */
export async function withApiHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    // BSONError is thrown by the MongoDB driver when an invalid ObjectId string is passed.
    // Return 400 instead of 500 so clients receive a meaningful error.
    if (err instanceof Error && err.name === 'BSONError') {
      return NextResponse.json({ error: 'Invalid resource ID format' }, { status: 400 })
    }
    logger.error({ err }, '[API error] Unhandled exception')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
