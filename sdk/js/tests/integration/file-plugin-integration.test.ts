/**
 * File Plugin Integration Tests
 *
 * Tests the complete integration flow from unified config to file fetching:
 * 1. Unified config loading
 * 2. File source resolution
 * 3. URI resolution with file plugin detection
 * 4. Storage manager routing
 * 5. Cache bypass for current project files
 * 6. Cross-project caching still works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { resolveReference } from '../../src/references/resolver.js'
import { FileSourceResolver } from '../../src/file-integration/source-resolver.js'
import { FilePluginStorage } from '../../src/storage/file-plugin.js'
import { StorageManager } from '../../src/storage/manager.js'
import { CacheManager } from '../../src/cache/manager.js'
import type { UnifiedConfig } from '../../src/schemas/config.js'

describe('file-plugin integration', () => {
  let tempDir: string
  let cacheDir: string
  let config: UnifiedConfig
  let sourceResolver: FileSourceResolver
  let storageManager: StorageManager
  let cacheManager: CacheManager

  beforeEach(async () => {
    // Create temp directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-test-'))
    cacheDir = path.join(tempDir, '.cache')

    // Create unified config
    config = {
      file: {
        schema_version: '2.0',
        sources: {
          specs: {
            type: 's3',
            bucket: 'test-files',
            prefix: 'specs/',
            region: 'us-east-1',
            local: {
              base_path: '.fractary/specs',
            },
            push: {
              compress: false,
              keep_local: true,
            },
            auth: {
              profile: 'default',
            },
          },
          logs: {
            type: 's3',
            bucket: 'test-files',
            prefix: 'logs/',
            region: 'us-east-1',
            local: {
              base_path: '.fractary/logs',
            },
            push: {
              compress: true,
              keep_local: true,
            },
            auth: {
              profile: 'default',
            },
          },
        },
      },
      codex: {
        schema_version: '2.0',
        organization: 'test-org',
        project: 'test-project',
        dependencies: {},
      },
    }

    // Initialize source resolver
    sourceResolver = new FileSourceResolver(config)

    // Initialize storage manager with file plugin
    storageManager = new StorageManager({
      local: { baseDir: tempDir },
      filePlugin: {
        config,
        baseDir: tempDir,
        enableS3Fallback: true,
      },
    })

    // Initialize cache manager
    cacheManager = new CacheManager({
      cacheDir,
      defaultTtl: 3600,
      enablePersistence: true,
    })
    cacheManager.setStorageManager(storageManager)

    // Create test directory structure
    await fs.mkdir(path.join(tempDir, '.fractary', 'specs'), { recursive: true })
    await fs.mkdir(path.join(tempDir, '.fractary', 'logs'), { recursive: true })

    // Create test files
    await fs.writeFile(
      path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md'),
      '# Test Specification\n\nThis is a test spec.'
    )
    await fs.writeFile(
      path.join(tempDir, '.fractary', 'logs', 'session-001.md'),
      '# Log Session\n\nThis is a log entry.'
    )
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('unified config and source resolution', () => {
    it('should load file sources from unified config', () => {
      const sources = sourceResolver.getAvailableSources()

      expect(sources).toHaveLength(2)
      expect(sources.map((s) => s.name)).toContain('specs')
      expect(sources.map((s) => s.name)).toContain('logs')
    })

    it('should resolve source by name', () => {
      const specsSource = sourceResolver.resolveSource('specs')

      expect(specsSource).not.toBeNull()
      expect(specsSource?.name).toBe('specs')
      expect(specsSource?.localPath).toBe('.fractary/specs')
      expect(specsSource?.bucket).toBe('test-files')
      expect(specsSource?.prefix).toBe('specs/')
    })

    it('should match paths to sources', () => {
      expect(sourceResolver.isFilePluginPath('.fractary/specs/SPEC-001.md')).toBe(true)
      expect(sourceResolver.isFilePluginPath('.fractary/logs/session-001.md')).toBe(true)
      expect(sourceResolver.isFilePluginPath('.fractary/other/file.md')).toBe(false)
    })

    it('should get source for specific path', () => {
      const source = sourceResolver.getSourceForPath('.fractary/specs/SPEC-001.md')

      expect(source).not.toBeNull()
      expect(source?.name).toBe('specs')
    })
  })

  describe('URI resolution with file plugin detection', () => {
    it('should resolve current project spec URI with file plugin source', () => {
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      expect(ref?.isCurrentProject).toBe(true)
      expect(ref?.sourceType).toBe('file-plugin')
      expect(ref?.filePluginSource).toBe('specs')
      expect(ref?.localPath).toContain('specs')
    })

    it('should resolve current project log URI with file plugin source', () => {
      const ref = resolveReference('codex://test-org/test-project/logs/session-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      expect(ref?.isCurrentProject).toBe(true)
      expect(ref?.sourceType).toBe('file-plugin')
      expect(ref?.filePluginSource).toBe('logs')
      expect(ref?.localPath).toContain('logs')
    })

    it('should not mark external project URIs as file plugin', () => {
      const ref = resolveReference('codex://other-org/other-project/specs/SPEC-002.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      expect(ref?.isCurrentProject).toBe(false)
      expect(ref?.sourceType).not.toBe('file-plugin')
      expect(ref?.filePluginSource).toBeUndefined()
    })

    it('should not mark non-file-plugin paths as file plugin', () => {
      const ref = resolveReference('codex://test-org/test-project/docs/README.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      expect(ref?.isCurrentProject).toBe(true)
      expect(ref?.sourceType).not.toBe('file-plugin')
    })
  })

  describe('storage manager routing', () => {
    it('should route current project file plugin requests to FilePluginStorage', () => {
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      const provider = storageManager.findProvider(ref)

      expect(provider).not.toBeNull()
      expect(provider?.name).toBe('file-plugin')
      expect(provider?.canHandle(ref)).toBe(true)
    })

    it('should route non-file-plugin requests to other providers', () => {
      const ref = resolveReference('codex://test-org/test-project/docs/README.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      const provider = storageManager.findProvider(ref)

      expect(provider).not.toBeNull()
      expect(provider?.name).not.toBe('file-plugin')
    })

    it('should fetch file plugin content successfully', async () => {
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      const result = await storageManager.fetch(ref)

      expect(result.content.toString()).toContain('Test Specification')
      expect(result.contentType).toBe('text/markdown')
      expect(result.source).toBe('file-plugin')
      expect(result.metadata?.filePluginSource).toBe('specs')
    })
  })

  describe('cache bypass for current project files', () => {
    it('should bypass cache when fetching current project file plugin content', async () => {
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      // First fetch
      const result1 = await cacheManager.get(ref)
      expect(result1.content.toString()).toContain('Test Specification')

      // Modify the file
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md'),
        '# Updated Specification\n\nThis content has been updated.'
      )

      // Second fetch should get updated content (not cached)
      const result2 = await cacheManager.get(ref)
      expect(result2.content.toString()).toContain('Updated Specification')
      expect(result2.content.toString()).not.toContain('Test Specification')
    })

    it('should not create cache entries for current project file plugin files', async () => {
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      // Fetch the file
      await cacheManager.get(ref)

      // Check that no cache entry was created
      const cacheEntry = await cacheManager.lookup(ref.uri)
      expect(cacheEntry.hit).toBe(false)
      expect(cacheEntry.entry).toBeNull()
    })

    it('should still cache external project files', async () => {
      // Create a local file for external project simulation
      await fs.mkdir(path.join(tempDir, 'external'), { recursive: true })
      await fs.writeFile(
        path.join(tempDir, 'external', 'SPEC-002.md'),
        '# External Spec\n\nExternal content'
      )

      const ref = resolveReference('codex://other-org/other-project/docs/SPEC-002.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      // Override localPath for test
      ref.localPath = 'external/SPEC-002.md'

      // First fetch - should cache
      const result1 = await cacheManager.get(ref)
      expect(result1.content.toString()).toContain('External Spec')

      // Modify the file
      await fs.writeFile(
        path.join(tempDir, 'external', 'SPEC-002.md'),
        '# Updated External\n\nUpdated content'
      )

      // Second fetch should get cached content (not updated)
      const result2 = await cacheManager.get(ref)
      expect(result2.content.toString()).toContain('External Spec')
      expect(result2.content.toString()).not.toContain('Updated External')

      // Verify cache entry exists
      const cacheEntry = await cacheManager.lookup(ref.uri)
      expect(cacheEntry.hit).toBe(true)
      expect(cacheEntry.entry).not.toBeNull()
    })
  })

  describe('end-to-end scenarios', () => {
    it('should handle complete flow for specs source', async () => {
      // 1. Resolve URI
      const ref = resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      // 2. Verify it's marked as file plugin
      expect(ref.sourceType).toBe('file-plugin')
      expect(ref.filePluginSource).toBe('specs')

      // 3. Find provider
      const provider = storageManager.findProvider(ref)
      expect(provider?.name).toBe('file-plugin')

      // 4. Fetch through cache manager
      const result = await cacheManager.get(ref)
      expect(result.content.toString()).toContain('Test Specification')
      expect(result.source).toBe('file-plugin')

      // 5. Verify no cache entry
      const cacheEntry = await cacheManager.lookup(ref.uri)
      expect(cacheEntry.hit).toBe(false)

      // 6. Modify and fetch again to verify always fresh
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md'),
        '# Fresh Content'
      )

      const freshResult = await cacheManager.get(ref)
      expect(freshResult.content.toString()).toContain('Fresh Content')
    })

    it('should handle complete flow for logs source', async () => {
      const ref = resolveReference('codex://test-org/test-project/logs/session-001.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      expect(ref.sourceType).toBe('file-plugin')
      expect(ref.filePluginSource).toBe('logs')

      const result = await cacheManager.get(ref)
      expect(result.content.toString()).toContain('Log Session')
      expect(result.source).toBe('file-plugin')
    })

    it('should handle missing file with helpful error', async () => {
      const ref = resolveReference('codex://test-org/test-project/specs/missing.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      try {
        await cacheManager.get(ref)
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.name).toBe('FilePluginFileNotFoundError')
        expect(error.message).toContain('file pull specs')
        expect(error.message).toContain('file sync')
      }
    })

    it('should handle multiple concurrent fetches', async () => {
      const refs = [
        resolveReference('codex://test-org/test-project/specs/SPEC-001.md', {
          currentOrg: 'test-org',
          currentProject: 'test-project',
          config,
        }),
        resolveReference('codex://test-org/test-project/logs/session-001.md', {
          currentOrg: 'test-org',
          currentProject: 'test-project',
          config,
        }),
      ]

      const results = await Promise.all(
        refs.map((ref) => (ref ? cacheManager.get(ref) : Promise.reject()))
      )

      expect(results).toHaveLength(2)
      expect(results[0].content.toString()).toContain('Test Specification')
      expect(results[1].content.toString()).toContain('Log Session')
    })

    it('should work with nested file paths', async () => {
      // Create nested structure
      await fs.mkdir(path.join(tempDir, '.fractary', 'specs', 'features', 'auth'), {
        recursive: true,
      })
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'features', 'auth', 'SPEC-AUTH-001.md'),
        '# Auth Spec'
      )

      const ref = resolveReference(
        'codex://test-org/test-project/specs/features/auth/SPEC-AUTH-001.md',
        {
          currentOrg: 'test-org',
          currentProject: 'test-project',
          config,
        }
      )

      expect(ref).not.toBeNull()
      if (!ref) return

      expect(ref.sourceType).toBe('file-plugin')
      expect(ref.filePluginSource).toBe('specs')

      const result = await cacheManager.get(ref)
      expect(result.content.toString()).toContain('Auth Spec')
    })
  })

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a file with no read permissions
      const restrictedFile = path.join(tempDir, '.fractary', 'specs', 'restricted.md')
      await fs.writeFile(restrictedFile, 'Secret content')
      await fs.chmod(restrictedFile, 0o000)

      const ref = resolveReference('codex://test-org/test-project/specs/restricted.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      try {
        await cacheManager.get(ref)
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error).toBeDefined()
        // Error might be permission error or not found depending on OS
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedFile, 0o644)
      }
    })

    it('should handle invalid source names gracefully', async () => {
      const ref = resolveReference('codex://test-org/test-project/invalid/file.md', {
        currentOrg: 'test-org',
        currentProject: 'test-project',
        config,
      })

      expect(ref).not.toBeNull()
      if (!ref) return

      // Should not be marked as file plugin
      expect(ref.sourceType).not.toBe('file-plugin')
    })
  })
})
