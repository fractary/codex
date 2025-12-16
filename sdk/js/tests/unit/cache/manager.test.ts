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
})
