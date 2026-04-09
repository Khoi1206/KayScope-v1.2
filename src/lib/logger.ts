import pino from 'pino'

/**
 * Structured server-side logger using pino.
 * Outputs JSON in production and pretty-printed logs in development
 * when LOG_LEVEL env var or pino-pretty is configured.
 *
 * Usage:
 *   import logger from '@/lib/logger'
 *   logger.error({ err }, 'Something failed')
 *   logger.info({ userId }, 'User action')
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
})

export default logger
