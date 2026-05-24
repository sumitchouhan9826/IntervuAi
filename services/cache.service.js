class MemoryCache {
  constructor() {
    this.cache = new Map();
    console.log('[CacheService] Initialized high-performance in-memory SaaS cache');
  }

  /**
   * Fetch a cached value, automatically cleaning up if expired.
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if expired or missing
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (cached.expiry && Date.now() > cached.expiry) {
      this.cache.delete(key);
      console.log(`[CacheService] Key expired & auto-deleted: ${key}`);
      return null;
    }

    console.log(`[CacheService] Cache HIT: ${key}`);
    return cached.value;
  }

  /**
   * Set a cached value with custom TTL in seconds.
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time-to-live in seconds
   */
  set(key, value, ttlSeconds = 300) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
    console.log(`[CacheService] Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Delete an individual cache key.
   * @param {string} key - Cache key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[CacheService] Cache INVALIDATED: ${key}`);
    }
  }

  /**
   * Clear all cache keys matching a regular expression pattern.
   * @param {string|RegExp} pattern - Pattern to clean keys by
   */
  clearPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
        console.log(`[CacheService] Pattern Cache INVALIDATED: ${key}`);
      }
    }
    if (count > 0) {
      console.log(`[CacheService] Invalidated ${count} keys for pattern:`, pattern);
    }
  }

  /**
   * Reset cache store completely.
   */
  clearAll() {
    this.cache.clear();
    console.log('[CacheService] Reset entire cache store');
  }
}

export const cacheService = new MemoryCache();
export default cacheService;
