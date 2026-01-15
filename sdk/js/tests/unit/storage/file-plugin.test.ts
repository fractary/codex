import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { FilePluginStorage } from '../../../src/storage/file-plugin.js'
import type { ResolvedReference } from '../../../src/references/index.js'
import type { UnifiedConfig, FileSource } from '../../../src/schemas/config.js'

describe('storage/file-plugin', () => {
  let tempDir: string
  let storage: FilePluginStorage

  function createFileSource(overrides?: Partial<FileSource>): FileSource {
    return {
      type: 's3',
      bucket: 'test-bucket',
      prefix: 'test/',
      region: 'us-east-1',
      local: {
        base_path: '.fractary/test',
      },
      push: {
        compress: false,
        keep_local: true,
      },
      auth: {
        profile: 'default',
      },
      ...overrides,
    }
  }

  function createUnifiedConfig(fileSources?: Record<string, FileSource>): UnifiedConfig {
    return {
      file: fileSources
        ? {
            schema_version: '2.0',
            sources: fileSources,
          }
        : undefined,
      codex: {
        schema_version: '2.0',
        organization: 'test-org',
        project: 'test-project',
        dependencies: {},
      },
    }
  }

  function createReference(overrides?: Partial<ResolvedReference>): ResolvedReference {
    return {
      uri: 'codex://test-org/test-project/specs/SPEC-001.md',
      org: 'test-org',
      project: 'test-project',
      path: 'specs/SPEC-001.md',
      cachePath: '.fractary/plugins/codex/cache/test-org/test-project/specs/SPEC-001.md',
      isCurrentProject: true,
      localPath: '.fractary/specs/SPEC-001.md',
      sourceType: 'file-plugin',
      filePluginSource: 'specs',
      ...overrides,
    }
  }

  beforeEach(async () => {
    // Create a temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-test-'))

    // Create test config
    const config = createUnifiedConfig({
      specs: createFileSource({
        type: 's3',
        bucket: 'test-bucket',
        prefix: 'specs/',
        local: { base_path: '.fractary/specs' },
      }),
      logs: createFileSource({
        type: 's3',
        bucket: 'test-bucket',
        prefix: 'logs/',
        local: { base_path: '.fractary/logs' },
      }),
    })

    storage = new FilePluginStorage({
      config,
      baseDir: tempDir,
      enableS3Fallback: true,
    })

    // Create test directory structure and files
    await fs.mkdir(path.join(tempDir, '.fractary', 'specs'), { recursive: true })
    await fs.mkdir(path.join(tempDir, '.fractary', 'logs'), { recursive: true })

    await fs.writeFile(
      path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md'),
      '# Test Spec\n\nTest content'
    )
    await fs.writeFile(path.join(tempDir, '.fractary', 'specs', 'test.txt'), 'Plain text content')
    await fs.writeFile(
      path.join(tempDir, '.fractary', 'specs', 'data.json'),
      '{"key": "value"}'
    )
    await fs.writeFile(
      path.join(tempDir, '.fractary', 'logs', 'session-001.md'),
      '# Log Session\n\nLog content'
    )
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })

      const instance = new FilePluginStorage({ config })

      expect(instance).toBeInstanceOf(FilePluginStorage)
      expect(instance.name).toBe('file-plugin')
      expect(instance.type).toBe('local')
    })

    it('should use provided baseDir', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })

      const instance = new FilePluginStorage({
        config,
        baseDir: '/custom/path',
      })

      expect(instance).toBeInstanceOf(FilePluginStorage)
    })

    it('should default to process.cwd() when no baseDir', () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })

      const instance = new FilePluginStorage({ config })

      expect(instance).toBeInstanceOf(FilePluginStorage)
    })

    it('should initialize with empty file sources', () => {
      const config = createUnifiedConfig()

      const instance = new FilePluginStorage({ config })

      expect(instance).toBeInstanceOf(FilePluginStorage)
    })
  })

  describe('canHandle', () => {
    it('should handle current project file plugin references', () => {
      const ref = createReference({
        isCurrentProject: true,
        sourceType: 'file-plugin',
        filePluginSource: 'specs',
      })

      expect(storage.canHandle(ref)).toBe(true)
    })

    it('should not handle non-current project references', () => {
      const ref = createReference({
        isCurrentProject: false,
        sourceType: 'file-plugin',
        filePluginSource: 'specs',
      })

      expect(storage.canHandle(ref)).toBe(false)
    })

    it('should not handle non-file-plugin references', () => {
      const ref = createReference({
        isCurrentProject: true,
        sourceType: 'local',
        filePluginSource: undefined,
      })

      expect(storage.canHandle(ref)).toBe(false)
    })

    it('should not handle github references', () => {
      const ref = createReference({
        isCurrentProject: false,
        sourceType: 'github',
        filePluginSource: undefined,
      })

      expect(storage.canHandle(ref)).toBe(false)
    })
  })

  describe('fetch', () => {
    it('should fetch markdown file content', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('# Test Spec\n\nTest content')
      expect(result.contentType).toBe('text/markdown')
      expect(result.source).toBe('file-plugin')
      expect(result.size).toBe(27)
    })

    it('should include metadata in result', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.filePluginSource).toBe('specs')
      expect(result.metadata?.localPath).toContain('.fractary/specs/SPEC-001.md')
    })

    it('should detect content type for text files', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/test.txt',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('Plain text content')
      expect(result.contentType).toBe('text/plain')
    })

    it('should detect content type for JSON files', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/data.json',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('{"key": "value"}')
      expect(result.contentType).toBe('application/json')
    })

    it('should fetch from different sources', async () => {
      const ref = createReference({
        localPath: '.fractary/logs/session-001.md',
        filePluginSource: 'logs',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('# Log Session\n\nLog content')
      expect(result.metadata?.filePluginSource).toBe('logs')
    })

    it('should handle absolute paths', async () => {
      const absolutePath = path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md')
      const ref = createReference({
        localPath: absolutePath,
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)

      expect(result.content.toString()).toBe('# Test Spec\n\nTest content')
    })

    it('should throw error when localPath is missing', async () => {
      const ref = createReference({
        localPath: undefined,
        filePluginSource: 'specs',
      })

      await expect(storage.fetch(ref)).rejects.toThrow('missing localPath')
    })

    it('should throw error when filePluginSource is missing', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: undefined,
      })

      await expect(storage.fetch(ref)).rejects.toThrow('missing source name')
    })

    it('should throw FilePluginFileNotFoundError for missing files', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/nonexistent.md',
        filePluginSource: 'specs',
      })

      await expect(storage.fetch(ref)).rejects.toThrow('File not found')
    })

    it('should include S3 fallback suggestions in error message', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/missing.md',
        filePluginSource: 'specs',
      })

      try {
        await storage.fetch(ref)
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.name).toBe('FilePluginFileNotFoundError')
        expect(error.message).toContain('file pull specs')
        expect(error.message).toContain('file sync')
        expect(error.message).toContain('cloud storage')
      }
    })

    it('should not include S3 fallback when disabled', async () => {
      const config = createUnifiedConfig({
        specs: createFileSource({ local: { base_path: '.fractary/specs' } }),
      })

      const noFallbackStorage = new FilePluginStorage({
        config,
        baseDir: tempDir,
        enableS3Fallback: false,
      })

      const ref = createReference({
        localPath: '.fractary/specs/missing.md',
        filePluginSource: 'specs',
      })

      try {
        await noFallbackStorage.fetch(ref)
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).not.toContain('file pull')
        expect(error.message).toContain('Please ensure the file exists')
      }
    })

    it('should detect various content types', async () => {
      const testFiles = [
        { file: 'test.yaml', content: 'key: value', expectedType: 'text/yaml' },
        { file: 'test.yml', content: 'key: value', expectedType: 'text/yaml' },
        { file: 'test.html', content: '<html></html>', expectedType: 'text/html' },
        { file: 'test.xml', content: '<root></root>', expectedType: 'application/xml' },
        { file: 'test.log', content: 'log entry', expectedType: 'text/plain' },
        { file: 'test.js', content: 'console.log()', expectedType: 'application/javascript' },
        { file: 'test.ts', content: 'const x = 1', expectedType: 'application/typescript' },
        { file: 'test.py', content: 'print("hello")', expectedType: 'text/x-python' },
        { file: 'test.sh', content: '#!/bin/bash', expectedType: 'application/x-sh' },
        { file: 'test.bin', content: 'binary', expectedType: 'application/octet-stream' },
      ]

      for (const { file, content, expectedType } of testFiles) {
        await fs.writeFile(path.join(tempDir, '.fractary', 'specs', file), content)

        const ref = createReference({
          localPath: `.fractary/specs/${file}`,
          filePluginSource: 'specs',
        })

        const result = await storage.fetch(ref)
        expect(result.contentType).toBe(expectedType)
      }
    })
  })

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: 'specs',
      })

      expect(await storage.exists(ref)).toBe(true)
    })

    it('should return false for non-existing file', async () => {
      const ref = createReference({
        localPath: '.fractary/specs/nonexistent.md',
        filePluginSource: 'specs',
      })

      expect(await storage.exists(ref)).toBe(false)
    })

    it('should return false when localPath is missing', async () => {
      const ref = createReference({
        localPath: undefined,
        filePluginSource: 'specs',
      })

      expect(await storage.exists(ref)).toBe(false)
    })

    it('should handle absolute paths', async () => {
      const absolutePath = path.join(tempDir, '.fractary', 'specs', 'SPEC-001.md')
      const ref = createReference({
        localPath: absolutePath,
        filePluginSource: 'specs',
      })

      expect(await storage.exists(ref)).toBe(true)
    })

    it('should check existence for different sources', async () => {
      const specsRef = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: 'specs',
      })

      const logsRef = createReference({
        localPath: '.fractary/logs/session-001.md',
        filePluginSource: 'logs',
      })

      expect(await storage.exists(specsRef)).toBe(true)
      expect(await storage.exists(logsRef)).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle nested directory structures', async () => {
      await fs.mkdir(path.join(tempDir, '.fractary', 'specs', 'deep', 'nested'), {
        recursive: true,
      })
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'deep', 'nested', 'SPEC-002.md'),
        '# Nested Spec'
      )

      const ref = createReference({
        localPath: '.fractary/specs/deep/nested/SPEC-002.md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.content.toString()).toBe('# Nested Spec')
    })

    it('should work with multiple file sources', async () => {
      const specsRef = createReference({
        localPath: '.fractary/specs/SPEC-001.md',
        filePluginSource: 'specs',
      })

      const logsRef = createReference({
        localPath: '.fractary/logs/session-001.md',
        filePluginSource: 'logs',
      })

      const specsResult = await storage.fetch(specsRef)
      const logsResult = await storage.fetch(logsRef)

      expect(specsResult.metadata?.filePluginSource).toBe('specs')
      expect(logsResult.metadata?.filePluginSource).toBe('logs')
      expect(specsResult.content.toString()).toContain('Test Spec')
      expect(logsResult.content.toString()).toContain('Log Session')
    })

    it('should handle empty files', async () => {
      await fs.writeFile(path.join(tempDir, '.fractary', 'specs', 'empty.md'), '')

      const ref = createReference({
        localPath: '.fractary/specs/empty.md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.content.toString()).toBe('')
      expect(result.size).toBe(0)
    })

    it('should handle large files', async () => {
      const largeContent = 'x'.repeat(10000)
      await fs.writeFile(path.join(tempDir, '.fractary', 'specs', 'large.md'), largeContent)

      const ref = createReference({
        localPath: '.fractary/specs/large.md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.size).toBe(10000)
      expect(result.content.toString()).toBe(largeContent)
    })
  })

  describe('edge cases', () => {
    it('should handle paths with special characters', async () => {
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'SPEC-001 (draft).md'),
        'Draft content'
      )

      const ref = createReference({
        localPath: '.fractary/specs/SPEC-001 (draft).md',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.content.toString()).toBe('Draft content')
    })

    it('should handle file names with dots', async () => {
      await fs.writeFile(
        path.join(tempDir, '.fractary', 'specs', 'config.v2.yaml'),
        'version: 2'
      )

      const ref = createReference({
        localPath: '.fractary/specs/config.v2.yaml',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.contentType).toBe('text/yaml')
      expect(result.content.toString()).toBe('version: 2')
    })

    it('should handle files without extensions', async () => {
      await fs.writeFile(path.join(tempDir, '.fractary', 'specs', 'README'), 'Readme content')

      const ref = createReference({
        localPath: '.fractary/specs/README',
        filePluginSource: 'specs',
      })

      const result = await storage.fetch(ref)
      expect(result.contentType).toBe('application/octet-stream')
      expect(result.content.toString()).toBe('Readme content')
    })
  })
})
