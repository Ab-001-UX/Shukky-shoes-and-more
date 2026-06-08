import redis from './redis.js'

class HybridCache {
  constructor() {
    this.localCache = new Map()
  }

  async set(key, value, ttlMs = 5 * 60 * 1000) {
    const expiresAt = Date.now() + ttlMs
    
    // Save to local in-memory cache
    this.localCache.set(key, { value, expiresAt })

    // Save to Upstash Redis if available
    if (redis) {
      try {
        const ttlSec = Math.ceil(ttlMs / 1000)
        // Store as stringified JSON under shukky: prefix
        await redis.set(`shukky:${key}`, JSON.stringify(value), { ex: ttlSec })
      } catch (error) {
        console.error(`[Redis] Error setting key ${key}:`, error)
      }
    }
  }

  async get(key) {
    // 1. Check local in-memory cache first (sub-millisecond)
    const localEntry = this.localCache.get(key)
    if (localEntry && Date.now() <= localEntry.expiresAt) {
      return localEntry.value
    } else if (localEntry) {
      this.localCache.delete(key) // Evict expired local key
    }

    // 2. Fallback to Upstash Redis
    if (redis) {
      try {
        const value = await redis.get(`shukky:${key}`)
        if (value) {
          // Parse value (Upstash SDK parses JSON automatically or returns a string/object)
          const parsed = typeof value === 'string' ? JSON.parse(value) : value
          
          // Hydrate local cache
          const ttlMs = 5 * 60 * 1000 // default 5m
          this.localCache.set(key, { value: parsed, expiresAt: Date.now() + ttlMs })
          
          return parsed
        }
      } catch (error) {
        console.error(`[Redis] Error getting key ${key}:`, error)
      }
    }

    return null
  }

  async delete(key) {
    this.localCache.delete(key)
    if (redis) {
      try {
        await redis.del(`shukky:${key}`)
      } catch (error) {
        console.error(`[Redis] Error deleting key ${key}:`, error)
      }
    }
  }

  async clearPattern(prefix) {
    // Clear locally
    for (const key of this.localCache.keys()) {
      if (key.startsWith(prefix)) {
        this.localCache.delete(key)
      }
    }

    // Clear from Redis (using scan for shukky:prefix*)
    if (redis) {
      try {
        let cursor = 0
        const searchPattern = `shukky:${prefix}*`
        do {
          const [nextCursor, keys] = await redis.scan(cursor, { match: searchPattern, count: 100 })
          cursor = Number(nextCursor)
          if (keys && keys.length > 0) {
            await redis.del(...keys)
          }
        } while (cursor !== 0)
      } catch (error) {
        console.error(`[Redis] Error clearing pattern ${prefix}:`, error)
      }
    }
  }


  clearAll() {
    this.localCache.clear()
  }
}

export const productCache = new HybridCache()
