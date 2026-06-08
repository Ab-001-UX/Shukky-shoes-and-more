class MemoryCache {
  constructor() {
    this.cache = new Map()
  }

  set(key, value, ttlMs = 5 * 60 * 1000) {
    const expiresAt = Date.now() + ttlMs
    this.cache.set(key, { value, expiresAt })
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  delete(key) {
    this.cache.delete(key)
  }

  // Clear keys starting with a prefix
  clearPattern(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  clearAll() {
    this.cache.clear()
  }
}

export const productCache = new MemoryCache()
