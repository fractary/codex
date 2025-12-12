/**
 * Cache manager
 *
 * Multi-tier cache manager that coordinates in-memory caching,
 * disk persistence, and storage providers for optimal performance.
 */

import type { ResolvedReference } from '../references/index.js'
import type { StorageManager } from '../storage/manager.js'
import type { FetchOptions, FetchResult } from '../storage/provider.js'
import {
  type CacheEntry,
  type CacheEntryMetadata,
  createCacheEntry,
  getCacheEntryStatus,
  touchCacheEntry,
  isCacheEntryFresh,
  getRemainingTtl,
} from './entry.js'
import { type CachePersistence, type CacheStats, createCachePersistence } from './persistence.js'

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
  /** Cache directory path */
  cacheDir: string
  /** Default TTL in seconds */
  defaultTtl?: number
  /** Maximum entries in memory cache */
  maxMemoryEntries?: number
  /** Maximum memory cache size in bytes */
  maxMemorySize?: number
  /** Whether to persist cache to disk */
  enablePersistence?: boolean
  /** Whether to use stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean
  /** Background refresh threshold (seconds before expiry) */
  backgroundRefreshThreshold?: number
}

/**
 * Cache lookup result
 */
export interface CacheLookupResult {
  /** Cache entry if found */
  entry: CacheEntry | null
  /** Whether the entry was found */
  hit: boolean
  /** Whether the entry is fresh */
  fresh: boolean
  /** Source of the entry (memory, disk, network) */
  source: 'memory' | 'disk' | 'network' | 'none'
}

/**
 * Cache manager
 *
 * Provides a multi-tier caching system with:
 * - L1: In-memory cache (fast, limited size)
 * - L2: Disk persistence (larger, survives restarts)
 * - L3: Storage providers (network fetch)
 */
export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private persistence: CachePersistence | null
  private storage: StorageManager | null = null
  private config: Required<CacheManagerConfig>

  // LRU tracking
  private accessOrder: string[] = []

  // Background refresh tracking
  private refreshPromises: Map<string, Promise<CacheEntry | null>> = new Map()

  constructor(config: CacheManagerConfig) {
    this.config = {
      cacheDir: config.cacheDir,
      defaultTtl: config.defaultTtl ?? 3600, // 1 hour default
      maxMemoryEntries: config.maxMemoryEntries ?? 1000,
      maxMemorySize: config.maxMemorySize ?? 50 * 1024 * 1024, // 50MB
      enablePersistence: config.enablePersistence ?? true,
      staleWhileRevalidate: config.staleWhileRevalidate ?? true,
      backgroundRefreshThreshold: config.backgroundRefreshThreshold ?? 60, // 1 minute
    }

    this.persistence = this.config.enablePersistence
      ? createCachePersistence({ cacheDir: this.config.cacheDir })
      : null
  }

  /**
   * Set the storage manager for fetching
   */
  setStorageManager(storage: StorageManager): void {
    this.storage = storage
  }

  /**
   * Get content for a reference
   *
   * Implements cache-first strategy with stale-while-revalidate.
   */
  async get(
    reference: ResolvedReference,
    options?: FetchOptions & { ttl?: number }
  ): Promise<FetchResult> {
    const ttl = options?.ttl ?? this.config.defaultTtl

    // Check memory cache
    let entry = this.memoryCache.get(reference.uri)

    // Check disk cache if not in memory
    if (!entry && this.persistence) {
      entry = await this.persistence.read(reference.uri) ?? undefined
      if (entry) {
        // Promote to memory cache
        this.setMemoryEntry(reference.uri, entry)
      }
    }

    if (entry) {
      const status = getCacheEntryStatus(entry)

      if (status === 'fresh') {
        touchCacheEntry(entry)
        return this.entryToResult(entry)
      }

      if (status === 'stale' && this.config.staleWhileRevalidate) {
        // Return stale content immediately
        touchCacheEntry(entry)
        const result = this.entryToResult(entry)

        // Trigger background refresh
        this.backgroundRefresh(reference, ttl, options)

        return result
      }
    }

    // Fetch from storage
    return this.fetchAndCache(reference, ttl, options)
  }

  /**
   * Check if content is cached
   */
  async has(uri: string): Promise<boolean> {
    if (this.memoryCache.has(uri)) {
      return true
    }

    if (this.persistence) {
      return this.persistence.exists(uri)
    }

    return false
  }

  /**
   * Get cache entry without fetching
   */
  async lookup(uri: string): Promise<CacheLookupResult> {
    // Check memory cache
    let entry = this.memoryCache.get(uri)
    if (entry) {
      return {
        entry,
        hit: true,
        fresh: isCacheEntryFresh(entry),
        source: 'memory',
      }
    }

    // Check disk cache
    if (this.persistence) {
      entry = await this.persistence.read(uri) ?? undefined
      if (entry) {
        this.setMemoryEntry(uri, entry)
        return {
          entry,
          hit: true,
          fresh: isCacheEntryFresh(entry),
          source: 'disk',
        }
      }
    }

    return {
      entry: null,
      hit: false,
      fresh: false,
      source: 'none',
    }
  }

  /**
   * Store content in cache
   */
  async set(uri: string, result: FetchResult, ttl?: number): Promise<CacheEntry> {
    const actualTtl = ttl ?? this.config.defaultTtl
    const entry = createCacheEntry(uri, result, actualTtl)

    // Store in memory
    this.setMemoryEntry(uri, entry)

    // Persist to disk
    if (this.persistence) {
      await this.persistence.write(entry)
    }

    return entry
  }

  /**
   * Invalidate a cache entry
   */
  async invalidate(uri: string): Promise<boolean> {
    let removed = false

    if (this.memoryCache.has(uri)) {
      this.memoryCache.delete(uri)
      this.removeFromAccessOrder(uri)
      removed = true
    }

    if (this.persistence) {
      const diskRemoved = await this.persistence.delete(uri)
      removed = removed || diskRemoved
    }

    return removed
  }

  /**
   * Invalidate all entries matching a pattern
   */
  async invalidatePattern(pattern: RegExp): Promise<number> {
    let count = 0

    // Memory cache
    for (const uri of this.memoryCache.keys()) {
      if (pattern.test(uri)) {
        this.memoryCache.delete(uri)
        this.removeFromAccessOrder(uri)
        count++
      }
    }

    // Disk cache
    if (this.persistence) {
      const uris = await this.persistence.list()
      for (const uri of uris) {
        if (pattern.test(uri)) {
          await this.persistence.delete(uri)
          count++
        }
      }
    }

    return count
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.accessOrder = []

    if (this.persistence) {
      await this.persistence.clear()
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    let count = 0
    const now = Date.now()

    // Memory cache
    for (const [uri, entry] of this.memoryCache) {
      if (entry.metadata.expiresAt < now) {
        this.memoryCache.delete(uri)
        this.removeFromAccessOrder(uri)
        count++
      }
    }

    // Disk cache
    if (this.persistence) {
      count += await this.persistence.clearExpired()
    }

    return count
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats & { memoryEntries: number; memorySize: number }> {
    let diskStats: CacheStats = {
      entryCount: 0,
      totalSize: 0,
      freshCount: 0,
      staleCount: 0,
      expiredCount: 0,
    }

    if (this.persistence) {
      diskStats = await this.persistence.getStats()
    }

    // Calculate memory stats
    let memorySize = 0
    for (const entry of this.memoryCache.values()) {
      memorySize += entry.metadata.size
    }

    return {
      ...diskStats,
      memoryEntries: this.memoryCache.size,
      memorySize,
    }
  }

  /**
   * Preload content into cache
   */
  async preload(references: ResolvedReference[], options?: FetchOptions): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage manager not set')
    }

    await Promise.all(
      references.map(async (ref) => {
        try {
          await this.get(ref, options)
        } catch {
          // Ignore preload errors
        }
      })
    )
  }

  /**
   * Get metadata for a cached entry
   */
  async getMetadata(uri: string): Promise<CacheEntryMetadata | null> {
    const result = await this.lookup(uri)
    return result.entry?.metadata ?? null
  }

  /**
   * Get remaining TTL for an entry
   */
  async getTtl(uri: string): Promise<number | null> {
    const result = await this.lookup(uri)
    if (result.entry) {
      return getRemainingTtl(result.entry)
    }
    return null
  }

  /**
   * Fetch content and store in cache
   */
  private async fetchAndCache(
    reference: ResolvedReference,
    ttl: number,
    options?: FetchOptions
  ): Promise<FetchResult> {
    if (!this.storage) {
      throw new Error('Storage manager not set')
    }

    const result = await this.storage.fetch(reference, options)
    await this.set(reference.uri, result, ttl)

    return result
  }

  /**
   * Background refresh for stale-while-revalidate
   */
  private backgroundRefresh(
    reference: ResolvedReference,
    ttl: number,
    options?: FetchOptions
  ): void {
    const uri = reference.uri

    // Don't start multiple refreshes for the same URI
    if (this.refreshPromises.has(uri)) {
      return
    }

    const promise = this.fetchAndCache(reference, ttl, options)
      .then(() => {
        const entry = this.memoryCache.get(uri)
        return entry ?? null
      })
      .catch(() => null)
      .finally(() => {
        this.refreshPromises.delete(uri)
      })

    this.refreshPromises.set(uri, promise)
  }

  /**
   * Set entry in memory cache with LRU eviction
   */
  private setMemoryEntry(uri: string, entry: CacheEntry): void {
    // Remove from current position in access order
    this.removeFromAccessOrder(uri)

    // Add to end (most recently used)
    this.accessOrder.push(uri)
    this.memoryCache.set(uri, entry)

    // Evict if necessary
    this.evictIfNeeded()
  }

  /**
   * Evict entries if over limits
   */
  private evictIfNeeded(): void {
    // Check entry count
    while (this.memoryCache.size > this.config.maxMemoryEntries) {
      this.evictOldest()
    }

    // Check memory size
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.metadata.size
    }

    while (totalSize > this.config.maxMemorySize && this.memoryCache.size > 0) {
      const evicted = this.evictOldest()
      if (evicted) {
        totalSize -= evicted.metadata.size
      } else {
        break
      }
    }
  }

  /**
   * Evict the oldest entry (LRU)
   */
  private evictOldest(): CacheEntry | null {
    if (this.accessOrder.length === 0) {
      return null
    }

    const oldest = this.accessOrder.shift()
    if (oldest) {
      const entry = this.memoryCache.get(oldest)
      this.memoryCache.delete(oldest)
      return entry ?? null
    }

    return null
  }

  /**
   * Remove URI from access order
   */
  private removeFromAccessOrder(uri: string): void {
    const index = this.accessOrder.indexOf(uri)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Convert cache entry to fetch result
   */
  private entryToResult(entry: CacheEntry): FetchResult {
    return {
      content: entry.content,
      contentType: entry.metadata.contentType,
      size: entry.metadata.size,
      source: entry.metadata.source,
      metadata: entry.metadata.providerMetadata,
    }
  }
}

/**
 * Create a cache manager
 */
export function createCacheManager(config: CacheManagerConfig): CacheManager {
  return new CacheManager(config)
}

/**
 * Default cache manager instance
 */
let defaultCacheManager: CacheManager | null = null

/**
 * Get the default cache manager
 */
export function getDefaultCacheManager(): CacheManager {
  if (!defaultCacheManager) {
    defaultCacheManager = createCacheManager({
      cacheDir: '.fractary/plugins/codex/cache',
    })
  }
  return defaultCacheManager
}

/**
 * Set the default cache manager
 */
export function setDefaultCacheManager(manager: CacheManager): void {
  defaultCacheManager = manager
}
