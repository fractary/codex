/**
 * Cache module
 *
 * Provides multi-tier caching with in-memory and disk persistence.
 * Implements stale-while-revalidate pattern for optimal performance.
 *
 * @example
 * ```typescript
 * import { createCacheManager, createStorageManager } from '@fractary/codex'
 *
 * const cache = createCacheManager({
 *   cacheDir: '.fractary/plugins/codex/cache',
 *   defaultTtl: 3600, // 1 hour
 * })
 *
 * const storage = createStorageManager()
 * cache.setStorageManager(storage)
 *
 * // Fetch with caching
 * const ref = resolveReference('codex://org/project/docs/api.md')
 * const result = await cache.get(ref)
 * ```
 */

// Cache entry types and utilities
export {
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheEntryStatus,
  type SerializedCacheEntry,
  createCacheEntry,
  getCacheEntryStatus,
  isCacheEntryValid,
  isCacheEntryFresh,
  touchCacheEntry,
  serializeCacheEntry,
  deserializeCacheEntry,
  getRemainingTtl,
  hasContentChanged,
  getCacheEntryAge,
  calculateContentHash,
} from './entry.js'

// Cache persistence layer
export {
  CachePersistence,
  createCachePersistence,
  type CachePersistenceOptions,
  type CacheStats,
} from './persistence.js'

// Cache manager
export {
  CacheManager,
  createCacheManager,
  getDefaultCacheManager,
  setDefaultCacheManager,
  type CacheManagerConfig,
  type CacheLookupResult,
} from './manager.js'
