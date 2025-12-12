import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { CachePersistence, createCachePersistence } from '../../../src/cache/persistence.js'
import type { CacheEntry } from '../../../src/cache/entry.js'

describe('cache/persistence', () => {
  let tempDir: string
  let persistence: CachePersistence

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-cache-test-'))
    persistence = new CachePersistence({ cacheDir: tempDir })
    await persistence.ensureDir()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  function createMockEntry(uri: string): CacheEntry {
    const now = Date.now()
    return {
      metadata: {
        uri,
        cachedAt: now,
        expiresAt: now + 3600 * 1000,
        ttl: 3600,
        contentHash: 'abc123',
        size: 12,
        contentType: 'text/markdown',
        source: 'github',
        accessCount: 1,
        lastAccessedAt: now,
      },
      content: Buffer.from('test content'),
    }
  }

  describe('constructor', () => {
    it('should create persistence with cacheDir', () => {
      const p = new CachePersistence({ cacheDir: '/custom/path' })
      expect(p.getCacheDir()).toBe('/custom/path')
    })

    it('should use default extension', () => {
      const p = new CachePersistence({ cacheDir: tempDir })
      const cachePath = p.getCachePath('codex://org/project/file.md')
      expect(cachePath.endsWith('.cache')).toBe(true)
    })

    it('should use custom extension', () => {
      const p = new CachePersistence({ cacheDir: tempDir, extension: '.dat' })
      const cachePath = p.getCachePath('codex://org/project/file.md')
      expect(cachePath.endsWith('.dat')).toBe(true)
    })
  })

  describe('createCachePersistence', () => {
    it('should create a CachePersistence instance', () => {
      const p = createCachePersistence({ cacheDir: tempDir })
      expect(p).toBeInstanceOf(CachePersistence)
    })
  })

  describe('getCachePath', () => {
    it('should return correct path for URI', () => {
      const cachePath = persistence.getCachePath('codex://org/project/docs/file.md')
      expect(cachePath).toBe(path.join(tempDir, 'org', 'project', 'docs', 'file.md.cache'))
    })

    it('should handle nested paths', () => {
      const cachePath = persistence.getCachePath('codex://org/project/deep/nested/path/file.md')
      expect(cachePath).toBe(path.join(tempDir, 'org', 'project', 'deep', 'nested', 'path', 'file.md.cache'))
    })

    it('should use index for URIs without file path', () => {
      const cachePath = persistence.getCachePath('codex://org/project')
      expect(cachePath).toBe(path.join(tempDir, 'org', 'project', 'index.cache'))
    })

    it('should throw for invalid URIs', () => {
      expect(() => persistence.getCachePath('invalid')).toThrow()
      expect(() => persistence.getCachePath('http://example.com')).toThrow()
    })
  })

  describe('getMetadataPath', () => {
    it('should return metadata path', () => {
      const metaPath = persistence.getMetadataPath('codex://org/project/file.md')
      expect(metaPath).toBe(path.join(tempDir, 'org', 'project', 'file.md.meta.json'))
    })
  })

  describe('write / read', () => {
    it('should write and read cache entry', async () => {
      const entry = createMockEntry('codex://org/project/docs/file.md')

      await persistence.write(entry)
      const read = await persistence.read('codex://org/project/docs/file.md')

      expect(read).toBeDefined()
      expect(read?.content.toString()).toBe('test content')
      expect(read?.metadata.uri).toBe('codex://org/project/docs/file.md')
    })

    it('should create directories if needed', async () => {
      const entry = createMockEntry('codex://org/project/deep/nested/file.md')

      await persistence.write(entry)

      const exists = await persistence.exists('codex://org/project/deep/nested/file.md')
      expect(exists).toBe(true)
    })

    it('should return null for non-existing entry', async () => {
      const read = await persistence.read('codex://org/project/nonexistent.md')
      expect(read).toBeNull()
    })

    it('should overwrite existing entry', async () => {
      const entry1 = createMockEntry('codex://org/project/file.md')
      entry1.content = Buffer.from('first content')

      const entry2 = createMockEntry('codex://org/project/file.md')
      entry2.content = Buffer.from('second content')

      await persistence.write(entry1)
      await persistence.write(entry2)

      const read = await persistence.read('codex://org/project/file.md')
      expect(read?.content.toString()).toBe('second content')
    })
  })

  describe('exists', () => {
    it('should return true for existing entry', async () => {
      const entry = createMockEntry('codex://org/project/file.md')
      await persistence.write(entry)

      expect(await persistence.exists('codex://org/project/file.md')).toBe(true)
    })

    it('should return false for non-existing entry', async () => {
      expect(await persistence.exists('codex://org/project/nonexistent.md')).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete existing entry', async () => {
      const entry = createMockEntry('codex://org/project/file.md')
      await persistence.write(entry)

      const deleted = await persistence.delete('codex://org/project/file.md')

      expect(deleted).toBe(true)
      expect(await persistence.exists('codex://org/project/file.md')).toBe(false)
    })

    it('should return false for non-existing entry', async () => {
      const deleted = await persistence.delete('codex://org/project/nonexistent.md')
      expect(deleted).toBe(false)
    })
  })

  describe('list', () => {
    it('should list all cached URIs', async () => {
      const entry1 = createMockEntry('codex://org/project/file1.md')
      const entry2 = createMockEntry('codex://org/project/file2.md')
      const entry3 = createMockEntry('codex://org/project/docs/file3.md')

      await persistence.write(entry1)
      await persistence.write(entry2)
      await persistence.write(entry3)

      const uris = await persistence.list()

      expect(uris).toHaveLength(3)
      expect(uris).toContain('codex://org/project/file1.md')
      expect(uris).toContain('codex://org/project/file2.md')
      expect(uris).toContain('codex://org/project/docs/file3.md')
    })

    it('should return empty array for empty cache', async () => {
      const uris = await persistence.list()
      expect(uris).toEqual([])
    })

    it('should list entries from multiple orgs and projects', async () => {
      const entry1 = createMockEntry('codex://org1/project1/file.md')
      const entry2 = createMockEntry('codex://org2/project2/file.md')

      await persistence.write(entry1)
      await persistence.write(entry2)

      const uris = await persistence.list()

      expect(uris).toHaveLength(2)
      expect(uris).toContain('codex://org1/project1/file.md')
      expect(uris).toContain('codex://org2/project2/file.md')
    })
  })

  describe('clear', () => {
    it('should clear all entries', async () => {
      const entry1 = createMockEntry('codex://org/project/file1.md')
      const entry2 = createMockEntry('codex://org/project/file2.md')

      await persistence.write(entry1)
      await persistence.write(entry2)

      const cleared = await persistence.clear()

      expect(cleared).toBeGreaterThan(0)
      expect(await persistence.list()).toEqual([])
    })

    it('should handle empty cache', async () => {
      const cleared = await persistence.clear()
      expect(cleared).toBe(0)
    })
  })

  describe('clearExpired', () => {
    it('should clear expired entries', async () => {
      const freshEntry = createMockEntry('codex://org/project/fresh.md')
      freshEntry.metadata.expiresAt = Date.now() + 3600 * 1000

      const expiredEntry = createMockEntry('codex://org/project/expired.md')
      expiredEntry.metadata.expiresAt = Date.now() - 3600 * 1000

      await persistence.write(freshEntry)
      await persistence.write(expiredEntry)

      const cleared = await persistence.clearExpired()

      expect(cleared).toBe(1)
      expect(await persistence.exists('codex://org/project/fresh.md')).toBe(true)
      expect(await persistence.exists('codex://org/project/expired.md')).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const freshEntry = createMockEntry('codex://org/project/fresh.md')
      freshEntry.metadata.expiresAt = Date.now() + 3600 * 1000
      freshEntry.metadata.size = 100

      const expiredEntry = createMockEntry('codex://org/project/expired.md')
      expiredEntry.metadata.expiresAt = Date.now() - 3600 * 1000
      expiredEntry.metadata.size = 50

      await persistence.write(freshEntry)
      await persistence.write(expiredEntry)

      const stats = await persistence.getStats()

      expect(stats.entryCount).toBe(2)
      expect(stats.totalSize).toBe(150)
      expect(stats.freshCount).toBe(1)
      expect(stats.expiredCount).toBe(1)
    })

    it('should return zeros for empty cache', async () => {
      const stats = await persistence.getStats()

      expect(stats.entryCount).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.freshCount).toBe(0)
    })
  })

  describe('atomic writes', () => {
    it('should use atomic writes by default', async () => {
      const p = new CachePersistence({ cacheDir: tempDir })
      const entry = createMockEntry('codex://org/project/file.md')

      await p.write(entry)

      // Entry should be written successfully
      expect(await p.exists('codex://org/project/file.md')).toBe(true)
    })

    it('should not leave temp files on success', async () => {
      const entry = createMockEntry('codex://org/project/file.md')
      await persistence.write(entry)

      const files = await fs.readdir(path.join(tempDir, 'org', 'project'))
      expect(files.some((f) => f.endsWith('.tmp'))).toBe(false)
    })
  })

  describe('ensureDir', () => {
    it('should create cache directory', async () => {
      const newDir = path.join(tempDir, 'new', 'cache')
      const p = new CachePersistence({ cacheDir: newDir })

      await p.ensureDir()

      const stat = await fs.stat(newDir)
      expect(stat.isDirectory()).toBe(true)
    })
  })
})
