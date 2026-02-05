/**
 * Cache manager
 *
 * Multi-tier cache manager that coordinates in-memory caching,
 * disk persistence, and storage providers for optimal performance.
 *
 * Memory Limitations:
 * - listEntries() loads all URIs into memory before processing
 * - Recommended for caches under 10,000 entries for optimal performance
 * - For very large caches, consider using listUris() with pagination logic
 */

// ===== Constants =====

/** Time window (ms) after expiry during which entries are considered stale vs expired */
export const STALE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/** Default batch size for parallel lookups */
const PARALLEL_LOOKUP_BATCH_SIZE = 50

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
 * Cache entry listing information
 */
export interface CacheEntryInfo {
  /** URI of the cached content */
  uri: string
  /** Content type (MIME type) */
  contentType: string
  /** Size in bytes */
  size: number
  /** Status: fresh, stale, or expired */
  status: 'fresh' | 'stale' | 'expired'
  /** When the entry was created */
  createdAt: number
  /** When the entry expires */
  expiresAt: number
  /** Remaining TTL in seconds (negative if expired) */
  remainingTtl: number
  /** Whether entry is in memory cache */
  inMemory: boolean
}

/**
 * Options for listing cache entries
 */
export interface ListEntriesOptions {
  /** Filter by status */
  status?: 'fresh' | 'stale' | 'expired' | 'all'
  /** Maximum number of entries to return */
  limit?: number
  /** Number of entries to skip (for pagination) */
  offset?: number
  /** Sort order */
  sortBy?: 'uri' | 'size' | 'createdAt' | 'expiresAt'
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
}

/**
 * Result of listing cache entries
 */
export interface ListEntriesResult {
  /** List of cache entries */
  entries: CacheEntryInfo[]
  /** Total number of entries (before pagination) */
  total: number
  /** Whether there are more entries */
  hasMore: boolean
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
   *
   * EXCEPTION: File plugin sources (current project files) bypass cache entirely.
   * They are always read fresh from disk for optimal development experience.
   */
  async get(
    reference: ResolvedReference,
    options?: FetchOptions & { ttl?: number }
  ): Promise<FetchResult> {
    // Bypass cache for current project file plugin sources
    // These are read directly from disk for freshness
    if (reference.isCurrentProject && reference.sourceType === 'file-plugin') {
      if (!this.storage) {
        throw new Error('Storage manager not set')
      }
      return await this.storage.fetch(reference, options)
    }

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
   * List all cache entries with detailed information
   *
   * Provides comprehensive information about each cached entry
   * with support for filtering, pagination, and sorting.
   */
  async listEntries(options: ListEntriesOptions = {}): Promise<ListEntriesResult> {
    const {
      status = 'all',
      limit,
      offset = 0,
      sortBy = 'uri',
      sortDirection = 'asc',
    } = options

    const entries: CacheEntryInfo[] = []
    const now = Date.now()

    // Get all URIs from persistence
    const uris = this.persistence ? await this.persistence.list() : []

    // Also include memory-only entries
    const memoryOnlyUris = Array.from(this.memoryCache.keys()).filter(
      (uri) => !uris.includes(uri)
    )
    const allUris = [...uris, ...memoryOnlyUris]

    // Process entries in parallel batches for better performance
    // This is much faster than sequential processing for large caches
    for (let i = 0; i < allUris.length; i += PARALLEL_LOOKUP_BATCH_SIZE) {
      const batch = allUris.slice(i, i + PARALLEL_LOOKUP_BATCH_SIZE)
      const lookupPromises = batch.map((uri) => this.lookup(uri).then((result) => ({ uri, result })))
      const lookupResults = await Promise.all(lookupPromises)

      for (const { uri, result: lookupResult } of lookupResults) {
        if (!lookupResult.entry) continue

        const entry = lookupResult.entry
        const expiresAt = entry.metadata.expiresAt
        const remainingTtl = Math.floor((expiresAt - now) / 1000)

        let entryStatus: 'fresh' | 'stale' | 'expired'
        if (now < expiresAt) {
          entryStatus = 'fresh'
        } else if (now < expiresAt + STALE_WINDOW_MS) {
          entryStatus = 'stale'
        } else {
          entryStatus = 'expired'
        }

        // Filter by status
        if (status !== 'all' && entryStatus !== status) {
          continue
        }

        entries.push({
          uri,
          contentType: entry.metadata.contentType,
          size: entry.metadata.size,
          status: entryStatus,
          createdAt: entry.metadata.cachedAt,
          expiresAt,
          remainingTtl,
          inMemory: this.memoryCache.has(uri),
        })
      }
    }

    // Sort entries
    entries.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'uri':
          comparison = a.uri.localeCompare(b.uri)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'createdAt':
          comparison = a.createdAt - b.createdAt
          break
        case 'expiresAt':
          comparison = a.expiresAt - b.expiresAt
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    const total = entries.length

    // Apply pagination
    const paginatedEntries = limit
      ? entries.slice(offset, offset + limit)
      : entries.slice(offset)

    return {
      entries: paginatedEntries,
      total,
      hasMore: limit ? offset + limit < total : false,
    }
  }

  /**
   * List all cached URIs
   *
   * Simple method to get just the URIs without detailed information.
   */
  async listUris(): Promise<string[]> {
    const uris = this.persistence ? await this.persistence.list() : []

    // Also include memory-only entries
    const memoryOnlyUris = Array.from(this.memoryCache.keys()).filter(
      (uri) => !uris.includes(uri)
    )

    return [...uris, ...memoryOnlyUris]
  }

  /**
   * Fetch content and store in cache
   *
   * EXCEPTION: File plugin sources are not cached (should not reach here,
   * but added as safety check).
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

    // Don't cache current project file plugin sources
    // They should always be read fresh from disk
    if (!(reference.isCurrentProject && reference.sourceType === 'file-plugin')) {
      await this.set(reference.uri, result, ttl)
    }

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
