import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // Sample 10% of transactions for performance tracking
  })
  console.log('[Sentry] Backend initialized successfully')
} else {
  console.warn('[Sentry] WARNING: SENTRY_DSN is not configured. Errors will not be reported to Sentry.')
}

export default Sentry
