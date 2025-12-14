import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateContentHash,
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
  type CacheEntry,
} from '../../../src/cache/entry.js'
import type { FetchResult } from '../../../src/storage/provider.js'

describe('cache/entry', () => {
  describe('calculateContentHash', () => {
    it('should calculate hash for content', () => {
      const content = Buffer.from('Hello, World!')
      const hash = calculateContentHash(content)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(8)
    })

    it('should return same hash for same content', () => {
      const content = Buffer.from('test content')
      const hash1 = calculateContentHash(content)
      const hash2 = calculateContentHash(content)

      expect(hash1).toBe(hash2)
    })

    it('should return different hash for different content', () => {
      const content1 = Buffer.from('content A')
      const content2 = Buffer.from('content B')
      const hash1 = calculateContentHash(content1)
      const hash2 = calculateContentHash(content2)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty content', () => {
      const content = Buffer.from('')
      const hash = calculateContentHash(content)

      expect(hash).toBeDefined()
      expect(hash.length).toBe(8)
    })
  })

  describe('createCacheEntry', () => {
    const mockFetchResult: FetchResult = {
      content: Buffer.from('test content'),
      contentType: 'text/markdown',
      size: 12,
      source: 'github',
      metadata: { sha: '123' },
    }

    it('should create cache entry with correct metadata', () => {
      const entry = createCacheEntry('codex://org/project/docs/file.md', mockFetchResult, 3600)

      expect(entry.content).toEqual(mockFetchResult.content)
      expect(entry.metadata.uri).toBe('codex://org/project/docs/file.md')
      expect(entry.metadata.ttl).toBe(3600)
      expect(entry.metadata.contentType).toBe('text/markdown')
      expect(entry.metadata.size).toBe(12)
      expect(entry.metadata.source).toBe('github')
      expect(entry.metadata.contentHash).toBeDefined()
      expect(entry.metadata.accessCount).toBe(1)
    })

    it('should set correct expiration time', () => {
      const before = Date.now()
      const entry = createCacheEntry('codex://org/project/file.md', mockFetchResult, 3600)
      const after = Date.now()

      expect(entry.metadata.cachedAt).toBeGreaterThanOrEqual(before)
      expect(entry.metadata.cachedAt).toBeLessThanOrEqual(after)
      expect(entry.metadata.expiresAt).toBe(entry.metadata.cachedAt + 3600 * 1000)
    })

    it('should preserve provider metadata', () => {
      const entry = createCacheEntry('codex://org/project/file.md', mockFetchResult, 3600)

      expect(entry.metadata.providerMetadata).toEqual({ sha: '123' })
    })

    it('should extract etag from metadata', () => {
      const result: FetchResult = {
        ...mockFetchResult,
        metadata: { etag: '"abc123"' },
      }
      const entry = createCacheEntry('codex://org/project/file.md', result, 3600)

      expect(entry.metadata.etag).toBe('"abc123"')
    })
  })

  describe('getCacheEntryStatus', () => {
    let mockEntry: CacheEntry

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return fresh for non-expired entry', () => {
      mockEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(getCacheEntryStatus(mockEntry)).toBe('fresh')
    })

    it('should return stale for recently expired entry', () => {
      mockEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now() - 3700 * 1000,
          expiresAt: Date.now() - 100 * 1000, // Expired 100 seconds ago
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(getCacheEntryStatus(mockEntry)).toBe('stale')
    })

    it('should return expired for old entry', () => {
      mockEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now() - 7200 * 1000,
          expiresAt: Date.now() - 3600 * 1000, // Expired an hour ago
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(getCacheEntryStatus(mockEntry)).toBe('expired')
    })
  })

  describe('isCacheEntryValid', () => {
    it('should return true for fresh entry', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(isCacheEntryValid(entry)).toBe(true)
    })

    it('should return true for stale entry', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now() - 3700 * 1000,
          expiresAt: Date.now() - 100 * 1000, // Recently expired
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(isCacheEntryValid(entry)).toBe(true)
    })
  })

  describe('isCacheEntryFresh', () => {
    it('should return true only for fresh entries', () => {
      const freshEntry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      const staleEntry: CacheEntry = {
        metadata: {
          ...freshEntry.metadata,
          expiresAt: Date.now() - 100 * 1000,
        },
        content: Buffer.from('test'),
      }

      expect(isCacheEntryFresh(freshEntry)).toBe(true)
      expect(isCacheEntryFresh(staleEntry)).toBe(false)
    })
  })

  describe('touchCacheEntry', () => {
    it('should increment access count', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now() - 1000,
        },
        content: Buffer.from('test'),
      }

      const oldAccessedAt = entry.metadata.lastAccessedAt

      touchCacheEntry(entry)

      expect(entry.metadata.accessCount).toBe(2)
      expect(entry.metadata.lastAccessedAt).toBeGreaterThan(oldAccessedAt)
    })
  })

  describe('serializeCacheEntry / deserializeCacheEntry', () => {
    it('should serialize and deserialize entry', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 12,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 5,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test content'),
      }

      const serialized = serializeCacheEntry(entry)
      const deserialized = deserializeCacheEntry(serialized)

      expect(deserialized.metadata).toEqual(entry.metadata)
      expect(deserialized.content.toString()).toBe('test content')
    })

    it('should serialize content as base64', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 5,
          contentType: 'text/plain',
          source: 'local',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('hello'),
      }

      const serialized = serializeCacheEntry(entry)

      expect(serialized.content).toBe(Buffer.from('hello').toString('base64'))
    })
  })

  describe('getRemainingTtl', () => {
    it('should return positive TTL for fresh entry', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      const remaining = getRemainingTtl(entry)

      expect(remaining).toBeGreaterThan(3500)
      expect(remaining).toBeLessThanOrEqual(3600)
    })

    it('should return 0 for expired entry', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now() - 7200 * 1000,
          expiresAt: Date.now() - 3600 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      expect(getRemainingTtl(entry)).toBe(0)
    })
  })

  describe('hasContentChanged', () => {
    it('should return false for same content', () => {
      const content = Buffer.from('test content')
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: calculateContentHash(content),
          size: content.length,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content,
      }

      expect(hasContentChanged(entry, content)).toBe(false)
    })

    it('should return true for different content', () => {
      const originalContent = Buffer.from('original')
      const newContent = Buffer.from('modified')
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 3600 * 1000,
          ttl: 3600,
          contentHash: calculateContentHash(originalContent),
          size: originalContent.length,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: originalContent,
      }

      expect(hasContentChanged(entry, newContent)).toBe(true)
    })
  })

  describe('getCacheEntryAge', () => {
    it('should return age in seconds', () => {
      const entry: CacheEntry = {
        metadata: {
          uri: 'codex://org/project/file.md',
          cachedAt: Date.now() - 60 * 1000, // 60 seconds ago
          expiresAt: Date.now() + 3540 * 1000,
          ttl: 3600,
          contentHash: 'abc123',
          size: 100,
          contentType: 'text/markdown',
          source: 'github',
          accessCount: 1,
          lastAccessedAt: Date.now(),
        },
        content: Buffer.from('test'),
      }

      const age = getCacheEntryAge(entry)

      expect(age).toBeGreaterThanOrEqual(60)
      expect(age).toBeLessThan(62)
    })
  })
})
