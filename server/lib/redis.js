import { Redis } from '@upstash/redis'

let redis = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    console.log('[Redis] Upstash Redis client initialized successfully')
  } catch (error) {
    console.error('[Redis] Failed to initialize Upstash Redis client:', error)
  }
} else {
  console.warn('[Redis] WARNING: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Caching will run in-memory only.')
}

export default redis
