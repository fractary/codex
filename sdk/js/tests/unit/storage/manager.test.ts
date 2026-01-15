import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  StorageManager,
  createStorageManager,
  getDefaultStorageManager,
  setDefaultStorageManager,
} from '../../../src/storage/manager.js'
import type { StorageProvider, FetchResult } from '../../../src/storage/provider.js'
import type { ResolvedReference } from '../../../src/references/index.js'

describe('storage/manager', () => {
  function createReference(overrides: Partial<ResolvedReference> = {}): ResolvedReference {
    return {
      uri: 'codex://org/project/docs/file.md',
      org: 'org',
      project: 'project',
      path: 'docs/file.md',
      cachePath: '.fractary/plugins/codex/cache/org/project/docs/file.md',
      isCurrentProject: false,
      ...overrides,
    }
  }

  function createMockProvider(
    name: string,
    type: 'local' | 'github' | 'http',
    canHandleResult: boolean,
    fetchResult?: FetchResult | Error
  ): StorageProvider {
    return {
      name,
      type,
      canHandle: vi.fn().mockReturnValue(canHandleResult),
      fetch: vi.fn().mockImplementation(async () => {
        if (fetchResult instanceof Error) {
          throw fetchResult
        }
        return fetchResult
      }),
      exists: vi.fn().mockResolvedValue(true),
    }
  }

  describe('constructor', () => {
    it('should create manager with default providers', () => {
      const manager = new StorageManager()
      const providers = manager.getProviders()

      expect(providers.length).toBe(3)
      expect(providers.find((p) => p.type === 'local')).toBeDefined()
      expect(providers.find((p) => p.type === 'github')).toBeDefined()
      expect(providers.find((p) => p.type === 'http')).toBeDefined()
    })

    it('should use default priority order', () => {
      const manager = new StorageManager()
      const status = manager.getStatus()

      expect(status[0]?.type).toBe('local')
      expect(status[1]?.type).toBe('github')
      expect(status[2]?.type).toBe('http')
    })

    it('should accept custom priority', () => {
      const manager = new StorageManager({
        priority: ['http', 'github', 'local'],
      })
      const status = manager.getStatus()

      expect(status[0]?.type).toBe('http')
      expect(status[1]?.type).toBe('github')
      expect(status[2]?.type).toBe('local')
    })
  })

  describe('createStorageManager', () => {
    it('should create a StorageManager instance', () => {
      const manager = createStorageManager()
      expect(manager).toBeInstanceOf(StorageManager)
    })

    it('should pass options to constructor', () => {
      const manager = createStorageManager({
        priority: ['github', 'local', 'http'],
      })
      const status = manager.getStatus()

      expect(status[0]?.type).toBe('github')
    })
  })

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      const manager = new StorageManager()
      const mockProvider = createMockProvider('custom', 'local', true)

      manager.registerProvider(mockProvider)

      expect(manager.getProvider('local')).toBe(mockProvider)
    })

    it('should replace existing provider of same type', () => {
      const manager = new StorageManager()
      const originalLocal = manager.getProvider('local')
      const newLocal = createMockProvider('new-local', 'local', true)

      manager.registerProvider(newLocal)

      expect(manager.getProvider('local')).toBe(newLocal)
      expect(manager.getProvider('local')).not.toBe(originalLocal)
    })
  })

  describe('removeProvider', () => {
    it('should remove a provider', () => {
      const manager = new StorageManager()

      const result = manager.removeProvider('http')

      expect(result).toBe(true)
      expect(manager.getProvider('http')).toBeUndefined()
    })

    it('should return false for non-existing provider', () => {
      const manager = new StorageManager()
      manager.removeProvider('http')

      const result = manager.removeProvider('http')

      expect(result).toBe(false)
    })
  })

  describe('getProvider', () => {
    it('should return provider by type', () => {
      const manager = new StorageManager()

      const local = manager.getProvider('local')

      expect(local).toBeDefined()
      expect(local?.type).toBe('local')
    })

    it('should return undefined for non-existing type', () => {
      const manager = new StorageManager()
      manager.removeProvider('http')

      expect(manager.getProvider('http')).toBeUndefined()
    })
  })

  describe('findProvider', () => {
    it('should find provider that can handle reference', () => {
      const manager = new StorageManager()

      // Current project reference - local should handle it
      const localRef = createReference({ isCurrentProject: true, localPath: 'docs/file.md' })
      const provider = manager.findProvider(localRef)

      expect(provider?.type).toBe('local')
    })

    it('should respect priority order', () => {
      const manager = new StorageManager()

      // Non-current project - github should handle before http
      const remoteRef = createReference({ isCurrentProject: false })
      const provider = manager.findProvider(remoteRef)

      expect(provider?.type).toBe('github')
    })

    it('should return null when no provider can handle', () => {
      const manager = new StorageManager()
      // Remove all providers
      manager.removeProvider('local')
      manager.removeProvider('github')
      manager.removeProvider('http')

      const ref = createReference()
      const provider = manager.findProvider(ref)

      expect(provider).toBeNull()
    })
  })

  describe('fetch', () => {
    it('should fetch using first provider that can handle', async () => {
      const manager = new StorageManager()
      const mockResult: FetchResult = {
        content: Buffer.from('test content'),
        contentType: 'text/markdown',
        size: 12,
        source: 'github',
      }

      const mockGitHub = createMockProvider('github', 'github', true, mockResult)
      manager.registerProvider(mockGitHub)

      const ref = createReference()
      const result = await manager.fetch(ref)

      expect(result).toBe(mockResult)
      // Manager now resolves auth options even when no auth is configured
      expect(mockGitHub.fetch).toHaveBeenCalledWith(ref, expect.objectContaining({ token: undefined }))
    })

    it('should try next provider on failure', async () => {
      const manager = new StorageManager()
      const mockResult: FetchResult = {
        content: Buffer.from('http content'),
        contentType: 'text/markdown',
        size: 12,
        source: 'http',
      }

      const failingGitHub = createMockProvider('github', 'github', true, new Error('GitHub failed'))
      const successfulHttp = createMockProvider('http', 'http', true, mockResult)

      manager.registerProvider(failingGitHub)
      manager.registerProvider(successfulHttp)

      const ref = createReference()
      const result = await manager.fetch(ref)

      expect(result).toBe(mockResult)
      expect(failingGitHub.fetch).toHaveBeenCalled()
      expect(successfulHttp.fetch).toHaveBeenCalled()
    })

    it('should skip providers that cannot handle', async () => {
      const manager = new StorageManager()
      const mockResult: FetchResult = {
        content: Buffer.from('github content'),
        contentType: 'text/markdown',
        size: 14,
        source: 'github',
      }

      // Local cannot handle (non-current project), GitHub can
      const ref = createReference({ isCurrentProject: false })
      const mockGitHub = createMockProvider('github', 'github', true, mockResult)
      manager.registerProvider(mockGitHub)

      const result = await manager.fetch(ref)

      expect(result).toBe(mockResult)
    })

    it('should throw when all providers fail', async () => {
      const manager = new StorageManager()

      const failingGitHub = createMockProvider('github', 'github', true, new Error('GitHub failed'))
      const failingHttp = createMockProvider('http', 'http', true, new Error('HTTP failed'))

      manager.registerProvider(failingGitHub)
      manager.registerProvider(failingHttp)

      const ref = createReference()

      await expect(manager.fetch(ref)).rejects.toThrow('All providers failed')
    })

    it('should throw when no provider can handle', async () => {
      const manager = new StorageManager()
      manager.removeProvider('local')
      manager.removeProvider('github')
      manager.removeProvider('http')

      const ref = createReference()

      await expect(manager.fetch(ref)).rejects.toThrow('No provider can handle')
    })
  })

  describe('exists', () => {
    it('should return true if any provider reports exists', async () => {
      const manager = new StorageManager()
      const mockProvider = createMockProvider('github', 'github', true)
      mockProvider.exists = vi.fn().mockResolvedValue(true)
      manager.registerProvider(mockProvider)

      const ref = createReference()
      const result = await manager.exists(ref)

      expect(result).toBe(true)
    })

    it('should return false if all providers report not exists', async () => {
      const manager = new StorageManager()
      const mockGitHub = createMockProvider('github', 'github', true)
      mockGitHub.exists = vi.fn().mockResolvedValue(false)
      const mockHttp = createMockProvider('http', 'http', true)
      mockHttp.exists = vi.fn().mockResolvedValue(false)

      manager.registerProvider(mockGitHub)
      manager.registerProvider(mockHttp)

      const ref = createReference()
      const result = await manager.exists(ref)

      expect(result).toBe(false)
    })

    it('should continue on provider error', async () => {
      const manager = new StorageManager()
      const mockGitHub = createMockProvider('github', 'github', true)
      mockGitHub.exists = vi.fn().mockRejectedValue(new Error('Network error'))
      const mockHttp = createMockProvider('http', 'http', true)
      mockHttp.exists = vi.fn().mockResolvedValue(true)

      manager.registerProvider(mockGitHub)
      manager.registerProvider(mockHttp)

      const ref = createReference()
      const result = await manager.exists(ref)

      expect(result).toBe(true)
    })
  })

  describe('fetchWith', () => {
    it('should fetch using specified provider', async () => {
      const manager = new StorageManager()
      const mockResult: FetchResult = {
        content: Buffer.from('http content'),
        contentType: 'text/markdown',
        size: 12,
        source: 'http',
      }

      const mockHttp = createMockProvider('http', 'http', true, mockResult)
      manager.registerProvider(mockHttp)

      const ref = createReference()
      const result = await manager.fetchWith('http', ref)

      expect(result).toBe(mockResult)
    })

    it('should throw for non-existing provider', async () => {
      const manager = new StorageManager()
      manager.removeProvider('http')

      const ref = createReference()

      await expect(manager.fetchWith('http', ref)).rejects.toThrow('Provider not found: http')
    })
  })

  describe('fetchMany', () => {
    it('should fetch multiple references in parallel', async () => {
      const manager = new StorageManager()
      const mockResult: FetchResult = {
        content: Buffer.from('content'),
        contentType: 'text/markdown',
        size: 7,
        source: 'github',
      }

      const mockGitHub = createMockProvider('github', 'github', true, mockResult)
      manager.registerProvider(mockGitHub)

      const refs = [createReference({ uri: 'codex://org/project/file1.md' }), createReference({ uri: 'codex://org/project/file2.md' })]

      const results = await manager.fetchMany(refs)

      expect(results.size).toBe(2)
      expect(results.get('codex://org/project/file1.md')).toBe(mockResult)
      expect(results.get('codex://org/project/file2.md')).toBe(mockResult)
    })

    it('should capture errors for failed fetches', async () => {
      const manager = new StorageManager()
      const mockGitHub = createMockProvider('github', 'github', true, new Error('Fetch failed'))
      manager.registerProvider(mockGitHub)

      const refs = [createReference({ uri: 'codex://org/project/file.md' })]

      const results = await manager.fetchMany(refs)

      expect(results.size).toBe(1)
      const result = results.get('codex://org/project/file.md')
      expect(result).toBeInstanceOf(Error)
    })
  })

  describe('getStatus', () => {
    it('should return status of all providers', () => {
      const manager = new StorageManager()
      const status = manager.getStatus()

      expect(status).toHaveLength(3)
      expect(status[0]).toEqual({ type: 'local', name: 'local', priority: 0 })
      expect(status[1]).toEqual({ type: 'github', name: 'github', priority: 1 })
      expect(status[2]).toEqual({ type: 'http', name: 'http', priority: 2 })
    })
  })

  describe('default manager', () => {
    beforeEach(() => {
      // Reset default manager
      setDefaultStorageManager(new StorageManager())
    })

    it('should create default manager on first call', () => {
      const manager = getDefaultStorageManager()
      expect(manager).toBeInstanceOf(StorageManager)
    })

    it('should return same instance on subsequent calls', () => {
      const manager1 = getDefaultStorageManager()
      const manager2 = getDefaultStorageManager()
      expect(manager1).toBe(manager2)
    })

    it('should allow setting custom default manager', () => {
      const customManager = new StorageManager({ priority: ['http', 'github', 'local'] })
      setDefaultStorageManager(customManager)

      const defaultManager = getDefaultStorageManager()
      expect(defaultManager).toBe(customManager)
    })
  })
})
