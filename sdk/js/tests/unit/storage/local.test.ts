import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { LocalStorage, createLocalStorage } from '../../../src/storage/local.js'
import type { ResolvedReference } from '../../../src/references/index.js'

describe('storage/local', () => {
  let tempDir: string
  let storage: LocalStorage

  beforeEach(async () => {
    // Create a temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-test-'))
    storage = new LocalStorage({ baseDir: tempDir })

    // Create test files
    await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true })
    await fs.writeFile(path.join(tempDir, 'docs', 'test.md'), '# Test\n\nHello world')
    await fs.writeFile(path.join(tempDir, 'test.txt'), 'Plain text content')
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  function createReference(overrides: Partial<ResolvedReference>): ResolvedReference {
    return {
      uri: 'codex://org/project/path',
      org: 'org',
      project: 'project',
      path: 'path',
      cachePath: '.fractary/plugins/codex/cache/org/project/path',
      isCurrentProject: true,
      localPath: 'path',
      ...overrides,
    }
  }

  describe('constructor', () => {
    it('should use provided baseDir', () => {
      const customStorage = new LocalStorage({ baseDir: '/custom/path' })
      expect(customStorage).toBeInstanceOf(LocalStorage)
    })

    it('should default to process.cwd() when no baseDir', () => {
      const defaultStorage = new LocalStorage()
      expect(defaultStorage).toBeInstanceOf(LocalStorage)
    })
  })

  describe('createLocalStorage', () => {
    it('should create a LocalStorage instance', () => {
      const instance = createLocalStorage({ baseDir: tempDir })
      expect(instance).toBeInstanceOf(LocalStorage)
    })
  })

  describe('canHandle', () => {
    it('should handle current project references with local path', () => {
      const ref = createReference({
        isCurrentProject: true,
        localPath: 'docs/test.md',
      })
      expect(storage.canHandle(ref)).toBe(true)
    })

    it('should not handle non-current project references', () => {
      const ref = createReference({
        isCurrentProject: false,
        localPath: 'docs/test.md',
      })
      expect(storage.canHandle(ref)).toBe(false)
    })

    it('should not handle references without local path', () => {
      const ref = createReference({
        isCurrentProject: true,
        localPath: undefined,
      })
      expect(storage.canHandle(ref)).toBe(false)
    })
  })

  describe('fetch', () => {
    it('should fetch file content', async () => {
      const ref = createReference({
        localPath: 'docs/test.md',
        path: 'docs/test.md',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('# Test\n\nHello world')
      expect(result.contentType).toBe('text/markdown')
      expect(result.source).toBe('local')
      expect(result.size).toBe(19)
    })

    it('should handle plain text files', async () => {
      const ref = createReference({
        localPath: 'test.txt',
        path: 'test.txt',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('Plain text content')
      expect(result.contentType).toBe('text/plain')
    })

    it('should throw error for missing file', async () => {
      const ref = createReference({
        localPath: 'nonexistent.md',
        path: 'nonexistent.md',
      })

      await expect(storage.fetch(ref)).rejects.toThrow('File not found')
    })

    it('should throw error for missing localPath', async () => {
      const ref = createReference({
        uri: 'codex://org/project',
        localPath: undefined,
      })

      await expect(storage.fetch(ref)).rejects.toThrow('No local path')
    })

    it('should include metadata in result', async () => {
      const ref = createReference({
        localPath: 'docs/test.md',
        path: 'docs/test.md',
      })

      const result = await storage.fetch(ref)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.path).toContain('docs/test.md')
      expect(result.metadata?.mtime).toBeDefined()
    })

    it('should handle absolute paths', async () => {
      const absolutePath = path.join(tempDir, 'test.txt')
      const ref = createReference({
        localPath: absolutePath,
        path: 'test.txt',
      })

      const result = await storage.fetch(ref)
      expect(result.content.toString()).toBe('Plain text content')
    })

    it('should respect maxSize option', async () => {
      // Create a larger file
      const largeContent = 'x'.repeat(1000)
      await fs.writeFile(path.join(tempDir, 'large.txt'), largeContent)

      const ref = createReference({
        localPath: 'large.txt',
        path: 'large.txt',
      })

      await expect(storage.fetch(ref, { maxSize: 100 })).rejects.toThrow('too large')
    })
  })

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const ref = createReference({
        localPath: 'docs/test.md',
        path: 'docs/test.md',
      })

      expect(await storage.exists(ref)).toBe(true)
    })

    it('should return false for non-existing file', async () => {
      const ref = createReference({
        localPath: 'nonexistent.md',
        path: 'nonexistent.md',
      })

      expect(await storage.exists(ref)).toBe(false)
    })

    it('should return false when localPath is missing', async () => {
      const ref = createReference({
        localPath: undefined,
      })

      expect(await storage.exists(ref)).toBe(false)
    })
  })

  describe('readText', () => {
    it('should read file as text', async () => {
      const content = await storage.readText('docs/test.md')
      expect(content).toBe('# Test\n\nHello world')
    })

    it('should handle absolute paths', async () => {
      const absolutePath = path.join(tempDir, 'test.txt')
      const content = await storage.readText(absolutePath)
      expect(content).toBe('Plain text content')
    })

    it('should throw for non-existing file', async () => {
      await expect(storage.readText('nonexistent.md')).rejects.toThrow()
    })
  })

  describe('write', () => {
    it('should write string content', async () => {
      await storage.write('new-file.txt', 'New content')

      const content = await fs.readFile(path.join(tempDir, 'new-file.txt'), 'utf-8')
      expect(content).toBe('New content')
    })

    it('should write Buffer content', async () => {
      const buffer = Buffer.from('Buffer content')
      await storage.write('buffer-file.txt', buffer)

      const content = await fs.readFile(path.join(tempDir, 'buffer-file.txt'), 'utf-8')
      expect(content).toBe('Buffer content')
    })

    it('should create parent directories', async () => {
      await storage.write('nested/deep/file.txt', 'Nested content')

      const content = await fs.readFile(path.join(tempDir, 'nested/deep/file.txt'), 'utf-8')
      expect(content).toBe('Nested content')
    })

    it('should overwrite existing file', async () => {
      await storage.write('docs/test.md', 'Updated content')

      const content = await fs.readFile(path.join(tempDir, 'docs/test.md'), 'utf-8')
      expect(content).toBe('Updated content')
    })
  })

  describe('delete', () => {
    it('should delete existing file', async () => {
      const result = await storage.delete('test.txt')

      expect(result).toBe(true)
      await expect(fs.access(path.join(tempDir, 'test.txt'))).rejects.toThrow()
    })

    it('should return false for non-existing file', async () => {
      const result = await storage.delete('nonexistent.txt')
      expect(result).toBe(false)
    })
  })

  describe('list', () => {
    it('should list files in directory', async () => {
      const files = await storage.list('docs')

      expect(files).toContain('docs/test.md')
    })

    it('should return only files, not directories', async () => {
      await fs.mkdir(path.join(tempDir, 'docs', 'subdir'))
      await fs.writeFile(path.join(tempDir, 'docs', 'another.txt'), 'content')

      const files = await storage.list('docs')

      expect(files).toContain('docs/test.md')
      expect(files).toContain('docs/another.txt')
      expect(files).not.toContain('docs/subdir')
    })

    it('should return empty array for non-existing directory', async () => {
      const files = await storage.list('nonexistent')
      expect(files).toEqual([])
    })

    it('should return empty array for empty directory', async () => {
      await fs.mkdir(path.join(tempDir, 'empty'))
      const files = await storage.list('empty')
      expect(files).toEqual([])
    })
  })
})
