/**
 * Cache entry types and utilities
 *
 * Defines the structure of cache entries with metadata for
 * TTL management, freshness checking, and content versioning.
 */

import type { FetchResult } from '../storage/provider.js'

/**
 * Cache entry status
 */
export type CacheEntryStatus = 'fresh' | 'stale' | 'expired'

/**
 * Cache entry metadata
 */
export interface CacheEntryMetadata {
  /** Original URI */
  uri: string
  /** When the entry was cached */
  cachedAt: number
  /** When the entry expires (timestamp) */
  expiresAt: number
  /** TTL in seconds */
  ttl: number
  /** ETag for conditional requests */
  etag?: string
  /** Last-Modified header value */
  lastModified?: string
  /** Content hash for change detection */
  contentHash: string
  /** Size in bytes */
  size: number
  /** Content type */
  contentType: string
  /** Source provider that fetched the content */
  source: string
  /** Number of times this entry has been accessed */
  accessCount: number
  /** Last access timestamp */
  lastAccessedAt: number
  /** Custom metadata from provider */
  providerMetadata?: Record<string, unknown>
}

/**
 * Cache entry with content and metadata
 */
export interface CacheEntry {
  /** Entry metadata */
  metadata: CacheEntryMetadata
  /** Cached content */
  content: Buffer
}

/**
 * Serializable cache entry for persistence
 */
export interface SerializedCacheEntry {
  /** Entry metadata */
  metadata: CacheEntryMetadata
  /** Content as base64 string */
  content: string
}

/**
 * Calculate a simple hash for content
 *
 * Uses a fast, non-cryptographic hash suitable for change detection.
 */
export function calculateContentHash(content: Buffer): string {
  // Simple FNV-1a hash for speed
  let hash = 2166136261
  for (let i = 0; i < content.length; i++) {
    hash ^= content[i] ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Create a new cache entry from fetch result
 */
export function createCacheEntry(uri: string, result: FetchResult, ttl: number): CacheEntry {
  const now = Date.now()

  const metadata: CacheEntryMetadata = {
    uri,
    cachedAt: now,
    expiresAt: now + ttl * 1000,
    ttl,
    contentHash: calculateContentHash(result.content),
    size: result.size,
    contentType: result.contentType,
    source: result.source,
    accessCount: 1,
    lastAccessedAt: now,
    providerMetadata: result.metadata,
  }

  // Extract ETag and Last-Modified from provider metadata if available
  if (result.metadata?.etag && typeof result.metadata.etag === 'string') {
    metadata.etag = result.metadata.etag
  }
  if (result.metadata?.lastModified && typeof result.metadata.lastModified === 'string') {
    metadata.lastModified = result.metadata.lastModified
  }

  return {
    metadata,
    content: result.content,
  }
}

/**
 * Get the status of a cache entry
 */
export function getCacheEntryStatus(entry: CacheEntry): CacheEntryStatus {
  const now = Date.now()

  if (now < entry.metadata.expiresAt) {
    return 'fresh'
  }

  // Consider stale for up to 5 minutes past expiry
  const staleWindow = 5 * 60 * 1000
  if (now < entry.metadata.expiresAt + staleWindow) {
    return 'stale'
  }

  return 'expired'
}

/**
 * Check if entry is still valid (fresh or stale)
 */
export function isCacheEntryValid(entry: CacheEntry): boolean {
  const status = getCacheEntryStatus(entry)
  return status === 'fresh' || status === 'stale'
}

/**
 * Check if entry is fresh (not expired)
 */
export function isCacheEntryFresh(entry: CacheEntry): boolean {
  return getCacheEntryStatus(entry) === 'fresh'
}

/**
 * Update entry access statistics
 */
export function touchCacheEntry(entry: CacheEntry): void {
  entry.metadata.accessCount++
  entry.metadata.lastAccessedAt = Date.now()
}

/**
 * Serialize cache entry for persistence
 */
export function serializeCacheEntry(entry: CacheEntry): SerializedCacheEntry {
  return {
    metadata: entry.metadata,
    content: entry.content.toString('base64'),
  }
}

/**
 * Deserialize cache entry from persistence
 */
export function deserializeCacheEntry(serialized: SerializedCacheEntry): CacheEntry {
  return {
    metadata: serialized.metadata,
    content: Buffer.from(serialized.content, 'base64'),
  }
}

/**
 * Calculate remaining TTL in seconds
 */
export function getRemainingTtl(entry: CacheEntry): number {
  const remaining = entry.metadata.expiresAt - Date.now()
  return Math.max(0, Math.floor(remaining / 1000))
}

/**
 * Check if content has changed based on hash
 */
export function hasContentChanged(entry: CacheEntry, newContent: Buffer): boolean {
  return entry.metadata.contentHash !== calculateContentHash(newContent)
}

/**
 * Get entry age in seconds
 */
export function getCacheEntryAge(entry: CacheEntry): number {
  return Math.floor((Date.now() - entry.metadata.cachedAt) / 1000)
}
