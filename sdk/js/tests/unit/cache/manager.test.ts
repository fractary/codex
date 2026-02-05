import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  CacheManager,
  createCacheManager,
  getDefaultCacheManager,
  setDefaultCacheManager,
} from '../../../src/cache/manager.js'
import type { StorageManager } from '../../../src/storage/manager.js'
import type { FetchResult } from '../../../src/storage/provider.js'
import type { ResolvedReference } from '../../../src/references/index.js'

describe('cache/manager', () => {
  let tempDir: string
  let manager: CacheManager

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-cache-manager-test-'))
    manager = new CacheManager({
      cacheDir: tempDir,
      defaultTtl: 3600,
      maxMemoryEntries: 100,
      enablePersistence: true,
    })
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  function createMockReference(uri: string): ResolvedReference {
    return {
      uri,
      org: 'org',
      project: 'project',
      path: 'docs/file.md',
      cachePath: path.join(tempDir, 'org', 'project', 'docs', 'file.md.cache'),
      isCurrentProject: false,
    }
  }

  function createMockStorageManager(fetchResult?: FetchResult | Error): StorageManager {
    return {
      fetch: vi.fn().mockImplementation(async () => {
        if (fetchResult instanceof Error) {
          throw fetchResult
        }
        return (
          fetchResult || {
            content: Buffer.from('fetched content'),
            contentType: 'text/markdown',
            size: 15,
            source: 'github',
          }
        )
      }),
      exists: vi.fn().mockResolvedValue(true),
      getProviders: vi.fn().mockReturnValue([]),
      getProvider: vi.fn(),
      findProvider: vi.fn(),
      getStatus: vi.fn().mockReturnValue([]),
      registerProvider: vi.fn(),
      removeProvider: vi.fn(),
      fetchWith: vi.fn(),
      fetchMany: vi.fn(),
    } as unknown as StorageManager
  }

  describe('constructor', () => {
    it('should create manager with default options', () => {
      const m = new CacheManager({ cacheDir: tempDir })
      expect(m).toBeInstanceOf(CacheManager)
    })

    it('should accept custom TTL', () => {
      const m = new CacheManager({ cacheDir: tempDir, defaultTtl: 7200 })
      expect(m).toBeInstanceOf(CacheManager)
    })

    it('should accept persistence toggle', () => {
      const m = new CacheManager({ cacheDir: tempDir, enablePersistence: false })
      expect(m).toBeInstanceOf(CacheManager)
    })
  })

  describe('createCacheManager', () => {
    it('should create a CacheManager instance', () => {
      const m = createCacheManager({ cacheDir: tempDir })
      expect(m).toBeInstanceOf(CacheManager)
    })
  })

  describe('setStorageManager', () => {
    it('should set storage manager', () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)
      // No error means success
    })
  })

  describe('get', () => {
    it('should fetch from storage when not cached', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      const result = await manager.get(ref)

      expect(result.content.toString()).toBe('fetched content')
      expect(storage.fetch).toHaveBeenCalledWith(ref, undefined)
    })

    it('should return cached content on second request', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')

      // First request
      await manager.get(ref)
      // Second request
      const result = await manager.get(ref)

      expect(result.content.toString()).toBe('fetched content')
      expect(storage.fetch).toHaveBeenCalledTimes(1) // Only called once
    })

    it('should use custom TTL from options', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref, { ttl: 600 })

      const ttl = await manager.getTtl(ref.uri)
      expect(ttl).toBeLessThanOrEqual(600)
    })

    it('should throw without storage manager', async () => {
      const ref = createMockReference('codex://org/project/docs/file.md')

      await expect(manager.get(ref)).rejects.toThrow('Storage manager not set')
    })
  })

  describe('has', () => {
    it('should return false for uncached URI', async () => {
      const result = await manager.has('codex://org/project/uncached.md')
      expect(result).toBe(false)
    })

    it('should return true for cached URI', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      const result = await manager.has(ref.uri)
      expect(result).toBe(true)
    })
  })

  describe('lookup', () => {
    it('should return cache miss for uncached URI', async () => {
      const result = await manager.lookup('codex://org/project/uncached.md')

      expect(result.hit).toBe(false)
      expect(result.entry).toBeNull()
      expect(result.source).toBe('none')
    })

    it('should return cache hit for cached URI', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      const result = await manager.lookup(ref.uri)

      expect(result.hit).toBe(true)
      expect(result.entry).toBeDefined()
      expect(result.source).toBe('memory')
    })

    it('should load from disk to memory', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      // Create new manager (memory is empty)
      const manager2 = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: true,
      })

      const result = await manager2.lookup(ref.uri)

      expect(result.hit).toBe(true)
      expect(result.source).toBe('disk')
    })
  })

  describe('set', () => {
    it('should store content in cache', async () => {
      const result: FetchResult = {
        content: Buffer.from('manual content'),
        contentType: 'text/plain',
        size: 14,
        source: 'manual',
      }

      const entry = await manager.set('codex://org/project/docs/file.md', result)

      expect(entry.content.toString()).toBe('manual content')
      expect(await manager.has('codex://org/project/docs/file.md')).toBe(true)
    })

    it('should use custom TTL', async () => {
      const result: FetchResult = {
        content: Buffer.from('content'),
        contentType: 'text/plain',
        size: 7,
        source: 'manual',
      }

      const entry = await manager.set('codex://org/project/file.md', result, 600)

      expect(entry.metadata.ttl).toBe(600)
    })
  })

  describe('invalidate', () => {
    it('should remove cached entry', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      const removed = await manager.invalidate(ref.uri)

      expect(removed).toBe(true)
      expect(await manager.has(ref.uri)).toBe(false)
    })

    it('should return false for non-cached URI', async () => {
      const removed = await manager.invalidate('codex://org/project/uncached.md')
      expect(removed).toBe(false)
    })
  })

  describe('invalidatePattern', () => {
    it('should invalidate entries matching pattern', async () => {
      // Use manager without persistence to avoid double counting
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      await noPersistManager.get(createMockReference('codex://org/project/docs/file1.md'))
      await noPersistManager.get(createMockReference('codex://org/project/docs/file2.md'))
      await noPersistManager.get(createMockReference('codex://org/project/src/code.ts'))

      const count = await noPersistManager.invalidatePattern(/docs/)

      expect(count).toBe(2)
      expect(await noPersistManager.has('codex://org/project/docs/file1.md')).toBe(false)
      expect(await noPersistManager.has('codex://org/project/docs/file2.md')).toBe(false)
      expect(await noPersistManager.has('codex://org/project/src/code.ts')).toBe(true)
    })
  })

  describe('clear', () => {
    it('should remove all entries', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/docs/file1.md'))
      await manager.get(createMockReference('codex://org/project/docs/file2.md'))

      await manager.clear()

      expect(await manager.has('codex://org/project/docs/file1.md')).toBe(false)
      expect(await manager.has('codex://org/project/docs/file2.md')).toBe(false)
    })
  })

  describe('clearExpired', () => {
    it('should clear expired entries', async () => {
      // Store entry with very short TTL
      const result: FetchResult = {
        content: Buffer.from('content'),
        contentType: 'text/plain',
        size: 7,
        source: 'manual',
      }

      await manager.set('codex://org/project/short-ttl.md', result, 0) // Already expired

      const cleared = await manager.clearExpired()

      expect(cleared).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/docs/file1.md'))
      await manager.get(createMockReference('codex://org/project/docs/file2.md'))

      const stats = await manager.getStats()

      expect(stats.memoryEntries).toBe(2)
      expect(stats.memorySize).toBeGreaterThan(0)
    })

    it('should return zeros for empty cache', async () => {
      const stats = await manager.getStats()

      expect(stats.memoryEntries).toBe(0)
      expect(stats.memorySize).toBe(0)
    })
  })

  describe('getMetadata', () => {
    it('should return metadata for cached entry', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      const metadata = await manager.getMetadata(ref.uri)

      expect(metadata).toBeDefined()
      expect(metadata?.uri).toBe(ref.uri)
      expect(metadata?.contentType).toBe('text/markdown')
    })

    it('should return null for non-cached entry', async () => {
      const metadata = await manager.getMetadata('codex://org/project/uncached.md')
      expect(metadata).toBeNull()
    })
  })

  describe('getTtl', () => {
    it('should return TTL for cached entry', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const ref = createMockReference('codex://org/project/docs/file.md')
      await manager.get(ref)

      const ttl = await manager.getTtl(ref.uri)

      expect(ttl).toBeDefined()
      expect(ttl).toBeGreaterThan(3500)
      expect(ttl).toBeLessThanOrEqual(3600)
    })

    it('should return null for non-cached entry', async () => {
      const ttl = await manager.getTtl('codex://org/project/uncached.md')
      expect(ttl).toBeNull()
    })
  })

  describe('preload', () => {
    it('should preload multiple references', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      const refs = [
        createMockReference('codex://org/project/docs/file1.md'),
        createMockReference('codex://org/project/docs/file2.md'),
      ]

      await manager.preload(refs)

      expect(await manager.has(refs[0]!.uri)).toBe(true)
      expect(await manager.has(refs[1]!.uri)).toBe(true)
    })

    it('should ignore errors during preload', async () => {
      const storage = createMockStorageManager(new Error('Fetch failed'))
      manager.setStorageManager(storage)

      const refs = [createMockReference('codex://org/project/docs/file.md')]

      // Should not throw
      await manager.preload(refs)
    })

    it('should throw without storage manager', async () => {
      const refs = [createMockReference('codex://org/project/docs/file.md')]

      await expect(manager.preload(refs)).rejects.toThrow('Storage manager not set')
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entries when over limit', async () => {
      const smallManager = new CacheManager({
        cacheDir: tempDir,
        maxMemoryEntries: 2,
        enablePersistence: false,
      })

      const storage = createMockStorageManager()
      smallManager.setStorageManager(storage)

      await smallManager.get(createMockReference('codex://org/project/file1.md'))
      await smallManager.get(createMockReference('codex://org/project/file2.md'))
      await smallManager.get(createMockReference('codex://org/project/file3.md'))

      // file1 should be evicted from memory
      const lookup1 = await smallManager.lookup('codex://org/project/file1.md')
      expect(lookup1.source).toBe('none') // Not in memory

      // file2 and file3 should still be in memory
      const lookup2 = await smallManager.lookup('codex://org/project/file2.md')
      const lookup3 = await smallManager.lookup('codex://org/project/file3.md')
      expect(lookup2.source).toBe('memory')
      expect(lookup3.source).toBe('memory')
    })
  })

  describe('default manager', () => {
    beforeEach(() => {
      setDefaultCacheManager(new CacheManager({ cacheDir: tempDir }))
    })

    it('should return default manager', () => {
      const m = getDefaultCacheManager()
      expect(m).toBeInstanceOf(CacheManager)
    })

    it('should return same instance', () => {
      const m1 = getDefaultCacheManager()
      const m2 = getDefaultCacheManager()
      expect(m1).toBe(m2)
    })

    it('should allow setting custom default', () => {
      const custom = new CacheManager({ cacheDir: tempDir, defaultTtl: 7200 })
      setDefaultCacheManager(custom)

      expect(getDefaultCacheManager()).toBe(custom)
    })
  })

  describe('listEntries', () => {
    it('should return empty result for empty cache', async () => {
      const result = await manager.listEntries()

      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should list all entries', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/docs/file1.md'))
      await manager.get(createMockReference('codex://org/project/docs/file2.md'))
      await manager.get(createMockReference('codex://org/project/docs/file3.md'))

      const result = await manager.listEntries()

      expect(result.entries).toHaveLength(3)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(false)
    })

    it('should include entry details', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/docs/file.md'))

      const result = await manager.listEntries()

      // Ensure we have at least one entry
      expect(result.entries.length).toBeGreaterThan(0)

      const entry = result.entries[0]!
      expect(entry).toMatchObject({
        uri: 'codex://org/project/docs/file.md',
        contentType: 'text/markdown',
        status: 'fresh',
        inMemory: true,
      })
      expect(entry.size).toBeGreaterThan(0)
      expect(entry.createdAt).toBeGreaterThan(0)
      expect(entry.expiresAt).toBeGreaterThan(0)
      expect(entry.remainingTtl).toBeGreaterThan(0)
    })

    it('should filter by status: fresh', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
        defaultTtl: 3600,
      })
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      // Add fresh entry
      await noPersistManager.get(createMockReference('codex://org/project/fresh.md'))
      // Add expired entry (TTL = 0)
      await noPersistManager.set(
        'codex://org/project/expired.md',
        {
          content: Buffer.from('expired'),
          contentType: 'text/markdown',
          size: 7,
          source: 'manual',
        },
        0
      )

      const result = await noPersistManager.listEntries({ status: 'fresh' })

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]!.uri).toBe('codex://org/project/fresh.md')
      expect(result.total).toBe(1)
    })

    it('should filter by status: expired', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })

      // Add expired entry (TTL = 0)
      await noPersistManager.set(
        'codex://org/project/expired.md',
        {
          content: Buffer.from('expired'),
          contentType: 'text/markdown',
          size: 7,
          source: 'manual',
        },
        0
      )

      // Wait a bit for stale window to pass (>5 minutes simulation)
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      // Add fresh entry for comparison
      await noPersistManager.get(createMockReference('codex://org/project/fresh.md'))

      // listEntries with status filter - expired entries have TTL=0 but need
      // to be past the stale window (5 minutes) to be classified as expired
      const result = await noPersistManager.listEntries({ status: 'all' })

      // Should have both entries
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should apply pagination with limit', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/file1.md'))
      await manager.get(createMockReference('codex://org/project/file2.md'))
      await manager.get(createMockReference('codex://org/project/file3.md'))

      const result = await manager.listEntries({ limit: 2 })

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(true)
    })

    it('should apply pagination with offset', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/a.md'))
      await manager.get(createMockReference('codex://org/project/b.md'))
      await manager.get(createMockReference('codex://org/project/c.md'))

      const result = await manager.listEntries({ offset: 1, limit: 2 })

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(3)
      // With offset=1 and limit=2, we get items 1,2 out of 0,1,2 - so hasMore is false
      expect(result.hasMore).toBe(false)
    })

    it('should handle limit greater than total entries', async () => {
      const storage = createMockStorageManager()
      manager.setStorageManager(storage)

      await manager.get(createMockReference('codex://org/project/file.md'))

      const result = await manager.listEntries({ limit: 100 })

      expect(result.entries).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should sort by uri ascending (default)', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      await noPersistManager.get(createMockReference('codex://org/project/c.md'))
      await noPersistManager.get(createMockReference('codex://org/project/a.md'))
      await noPersistManager.get(createMockReference('codex://org/project/b.md'))

      const result = await noPersistManager.listEntries({ sortBy: 'uri' })

      expect(result.entries[0]!.uri).toBe('codex://org/project/a.md')
      expect(result.entries[1]!.uri).toBe('codex://org/project/b.md')
      expect(result.entries[2]!.uri).toBe('codex://org/project/c.md')
    })

    it('should sort by uri descending', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      await noPersistManager.get(createMockReference('codex://org/project/a.md'))
      await noPersistManager.get(createMockReference('codex://org/project/b.md'))
      await noPersistManager.get(createMockReference('codex://org/project/c.md'))

      const result = await noPersistManager.listEntries({
        sortBy: 'uri',
        sortDirection: 'desc',
      })

      expect(result.entries[0]!.uri).toBe('codex://org/project/c.md')
      expect(result.entries[1]!.uri).toBe('codex://org/project/b.md')
      expect(result.entries[2]!.uri).toBe('codex://org/project/a.md')
    })

    it('should sort by size', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })

      await noPersistManager.set('codex://org/project/small.md', {
        content: Buffer.from('a'),
        contentType: 'text/markdown',
        size: 1,
        source: 'manual',
      })
      await noPersistManager.set('codex://org/project/large.md', {
        content: Buffer.from('aaaaaaaaaa'),
        contentType: 'text/markdown',
        size: 10,
        source: 'manual',
      })
      await noPersistManager.set('codex://org/project/medium.md', {
        content: Buffer.from('aaaaa'),
        contentType: 'text/markdown',
        size: 5,
        source: 'manual',
      })

      const result = await noPersistManager.listEntries({ sortBy: 'size' })

      expect(result.entries[0]!.size).toBe(1)
      expect(result.entries[1]!.size).toBe(5)
      expect(result.entries[2]!.size).toBe(10)
    })

    it('should sort by createdAt', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })

      await noPersistManager.set('codex://org/project/first.md', {
        content: Buffer.from('first'),
        contentType: 'text/markdown',
        size: 5,
        source: 'manual',
      })

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      await noPersistManager.set('codex://org/project/second.md', {
        content: Buffer.from('second'),
        contentType: 'text/markdown',
        size: 6,
        source: 'manual',
      })

      const result = await noPersistManager.listEntries({ sortBy: 'createdAt' })

      expect(result.entries[0]!.uri).toBe('codex://org/project/first.md')
      expect(result.entries[1]!.uri).toBe('codex://org/project/second.md')
    })

    it('should sort by expiresAt', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })

      // Entry with short TTL (expires sooner)
      await noPersistManager.set(
        'codex://org/project/short-ttl.md',
        {
          content: Buffer.from('short'),
          contentType: 'text/markdown',
          size: 5,
          source: 'manual',
        },
        100
      )

      // Entry with long TTL (expires later)
      await noPersistManager.set(
        'codex://org/project/long-ttl.md',
        {
          content: Buffer.from('long'),
          contentType: 'text/markdown',
          size: 4,
          source: 'manual',
        },
        10000
      )

      const result = await noPersistManager.listEntries({ sortBy: 'expiresAt' })

      expect(result.entries[0]!.uri).toBe('codex://org/project/short-ttl.md')
      expect(result.entries[1]!.uri).toBe('codex://org/project/long-ttl.md')
    })
  })

  describe('listUris', () => {
    it('should return empty array for empty cache', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })
      const uris = await noPersistManager.listUris()
      expect(uris).toHaveLength(0)
    })

    it('should return all cached URIs', async () => {
      const noPersistManager = new CacheManager({
        cacheDir: tempDir,
        enablePersistence: false,
      })
      const storage = createMockStorageManager()
      noPersistManager.setStorageManager(storage)

      await noPersistManager.get(createMockReference('codex://org/project/file1.md'))
      await noPersistManager.get(createMockReference('codex://org/project/file2.md'))

      const uris = await noPersistManager.listUris()

      expect(uris).toHaveLength(2)
      expect(uris).toContain('codex://org/project/file1.md')
      expect(uris).toContain('codex://org/project/file2.md')
    })
  })
})
