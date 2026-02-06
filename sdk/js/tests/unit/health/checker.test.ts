import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  HealthChecker,
  createHealthChecker,
  type HealthCheck,
  type HealthResult,
  type HealthConfig,
} from '../../../src/health/checker.js'
import { CacheManager } from '../../../src/cache/manager.js'
import { TypeRegistry, createDefaultRegistry } from '../../../src/types/registry.js'

describe('health/checker', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-health-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  async function createConfigFile(config: HealthConfig): Promise<void> {
    const configDir = path.join(tempDir, '.fractary')
    await fs.mkdir(configDir, { recursive: true })
    const yaml = await import('js-yaml')
    await fs.writeFile(
      path.join(configDir, 'config.yaml'),
      yaml.dump(config),
      'utf-8'
    )
  }

  async function createLegacyConfigFile(): Promise<void> {
    const legacyDir = path.join(tempDir, '.fractary', 'plugins', 'codex')
    await fs.mkdir(legacyDir, { recursive: true })
    await fs.writeFile(
      path.join(legacyDir, 'config.json'),
      JSON.stringify({ organization: 'test' }),
      'utf-8'
    )
  }

  describe('constructor', () => {
    it('should create checker with default options', () => {
      const checker = new HealthChecker()
      expect(checker).toBeInstanceOf(HealthChecker)
    })

    it('should accept custom project root', () => {
      const checker = new HealthChecker({ projectRoot: tempDir })
      expect(checker.getConfigPath()).toBe(path.join(tempDir, '.fractary', 'config.yaml'))
    })

    it('should accept pre-loaded config', () => {
      const config: HealthConfig = { organization: 'test' }
      const checker = new HealthChecker({ config })
      expect(checker).toBeInstanceOf(HealthChecker)
    })
  })

  describe('createHealthChecker', () => {
    it('should create a HealthChecker instance', () => {
      const checker = createHealthChecker()
      expect(checker).toBeInstanceOf(HealthChecker)
    })

    it('should pass options through', () => {
      const checker = createHealthChecker({ projectRoot: tempDir })
      expect(checker.getConfigPath()).toBe(path.join(tempDir, '.fractary', 'config.yaml'))
    })
  })

  describe('checkConfiguration', () => {
    it('should fail when no config exists', async () => {
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.name).toBe('Configuration')
      expect(result.status).toBe('fail')
      expect(result.message).toContain('No configuration found')
    })

    it('should warn for legacy config', async () => {
      await createLegacyConfigFile()
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('Legacy JSON configuration')
    })

    it('should warn when no organization configured', async () => {
      await createConfigFile({})
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('No organization configured')
    })

    it('should warn when no storage providers configured', async () => {
      await createConfigFile({ organization: 'test' })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('No storage providers')
    })

    it('should pass with valid configuration', async () => {
      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'github' }],
      })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.status).toBe('pass')
      expect(result.message).toBe('Valid YAML configuration')
      expect(result.details).toContain('test')
    })

    it('should support organization in codex section', async () => {
      await createConfigFile({
        codex: { organization: 'codex-org', codex_repo: 'repo' },
        storage: [{ type: 'github' }],
      })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkConfiguration()

      expect(result.status).toBe('pass')
      expect(result.details).toContain('codex-org')
    })

    it('should use pre-loaded config', async () => {
      const checker = new HealthChecker({
        projectRoot: tempDir,
        config: { organization: 'preloaded', storage: [{ type: 'local' }] },
      })
      // Create a different config file to verify pre-loaded is used
      await createConfigFile({ organization: 'file-org' })

      const result = await checker.checkConfiguration()

      expect(result.status).toBe('pass')
      expect(result.details).toContain('preloaded')
    })
  })

  describe('checkCache', () => {
    it('should warn when no cache manager available', async () => {
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkCache()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('No cache manager available')
    })

    it('should warn for empty cache', async () => {
      const cacheManager = new CacheManager({
        cacheDir: path.join(tempDir, 'cache'),
        enablePersistence: false,
      })
      const checker = new HealthChecker({
        projectRoot: tempDir,
        cacheManager,
      })
      const result = await checker.checkCache()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('Cache is empty')
    })

    it('should pass for healthy cache', async () => {
      const cacheDir = path.join(tempDir, 'cache')
      await fs.mkdir(cacheDir, { recursive: true })
      const cacheManager = new CacheManager({
        cacheDir,
        enablePersistence: true, // Enable persistence to properly track entries
        defaultTtl: 3600,
      })

      // Add some entries
      await cacheManager.set('codex://org/project/file1.md', {
        content: Buffer.from('content1'),
        contentType: 'text/markdown',
        size: 8,
        source: 'manual',
      })
      await cacheManager.set('codex://org/project/file2.md', {
        content: Buffer.from('content2'),
        contentType: 'text/markdown',
        size: 8,
        source: 'manual',
      })

      const checker = new HealthChecker({
        projectRoot: tempDir,
        cacheManager,
      })
      const result = await checker.checkCache()

      expect(result.status).toBe('pass')
      expect(result.message).toContain('2 entries')
      expect(result.message).toContain('100% fresh')
    })

    it('should warn for degraded cache (< 50% fresh) via checkCacheFromStats', () => {
      // Note: Testing via checkCacheFromStats since actual cache behavior with TTL=0
      // can vary based on implementation details. This tests the health check logic directly.
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = checker.checkCacheFromStats({
        entryCount: 10,
        memoryEntries: 5,
        diskEntries: 5,
        totalSize: 1024,
        memorySize: 512,
        diskSize: 512,
        freshCount: 2, // Only 20% fresh
        staleCount: 3,
        expiredCount: 5,
      })

      expect(result.status).toBe('warn')
      expect(result.message).toContain('20% fresh')
      expect(result.details).toContain('5 expired')
    })
  })

  describe('checkCacheFromStats', () => {
    it('should warn for empty cache', () => {
      const checker = new HealthChecker()
      const result = checker.checkCacheFromStats({
        entryCount: 0,
        memoryEntries: 0,
        diskEntries: 0,
        totalSize: 0,
        memorySize: 0,
        diskSize: 0,
        freshCount: 0,
        staleCount: 0,
        expiredCount: 0,
      })

      expect(result.status).toBe('warn')
      expect(result.message).toContain('Cache is empty')
    })

    it('should pass for healthy cache', () => {
      const checker = new HealthChecker()
      const result = checker.checkCacheFromStats({
        entryCount: 10,
        memoryEntries: 5,
        diskEntries: 5,
        totalSize: 1024,
        memorySize: 512,
        diskSize: 512,
        freshCount: 10,
        staleCount: 0,
        expiredCount: 0,
      })

      expect(result.status).toBe('pass')
      expect(result.message).toContain('10 entries')
      expect(result.message).toContain('100% fresh')
    })

    it('should warn for degraded cache', () => {
      const checker = new HealthChecker()
      const result = checker.checkCacheFromStats({
        entryCount: 10,
        memoryEntries: 5,
        diskEntries: 5,
        totalSize: 1024,
        memorySize: 512,
        diskSize: 512,
        freshCount: 2,
        staleCount: 3,
        expiredCount: 5,
      })

      expect(result.status).toBe('warn')
      expect(result.message).toContain('20% fresh')
      expect(result.details).toContain('5 expired')
    })
  })

  describe('checkStorage', () => {
    it('should fail when config not available', async () => {
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkStorage()

      expect(result.status).toBe('fail')
      expect(result.message).toContain('Configuration not available')
    })

    it('should warn when no providers configured', async () => {
      await createConfigFile({ organization: 'test' })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkStorage()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('No storage providers')
    })

    it('should warn when GITHUB_TOKEN not set for github provider', async () => {
      const originalToken = process.env.GITHUB_TOKEN
      delete process.env.GITHUB_TOKEN

      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'github' }],
      })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkStorage()

      expect(result.status).toBe('warn')
      expect(result.details).toContain('GITHUB_TOKEN not set')

      // Restore
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken
      }
    })

    it('should pass with valid providers', async () => {
      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'local' }, { type: 'http' }],
      })
      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.checkStorage()

      expect(result.status).toBe('pass')
      expect(result.message).toContain('2 provider(s)')
      expect(result.message).toContain('local, http')
    })
  })

  describe('checkTypes', () => {
    it('should warn when no type registry available', () => {
      const checker = new HealthChecker()
      const result = checker.checkTypes()

      expect(result.status).toBe('warn')
      expect(result.message).toContain('No type registry available')
    })

    it('should pass with type registry', () => {
      const registry = createDefaultRegistry()
      const checker = new HealthChecker({ typeRegistry: registry })
      const result = checker.checkTypes()

      expect(result.status).toBe('pass')
      expect(result.message).toContain('types registered')
      expect(result.details).toContain('built-in')
    })
  })

  describe('checkTypesFromRegistry', () => {
    it('should pass with valid registry', () => {
      const registry = createDefaultRegistry()
      const checker = new HealthChecker()
      const result = checker.checkTypesFromRegistry(registry)

      expect(result.status).toBe('pass')
      expect(result.message).toContain('types registered')
    })
  })

  describe('runAll', () => {
    it('should run all health checks', async () => {
      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'local' }],
      })

      const cacheManager = new CacheManager({
        cacheDir: path.join(tempDir, 'cache'),
        enablePersistence: false,
      })
      const registry = createDefaultRegistry()

      const checker = new HealthChecker({
        projectRoot: tempDir,
        cacheManager,
        typeRegistry: registry,
      })
      const result = await checker.runAll()

      expect(result.checks).toHaveLength(4)
      expect(result.summary.total).toBe(4)
    })
  })

  describe('run', () => {
    it('should run specified checks only', async () => {
      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'local' }],
      })

      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.run(['config', 'storage'])

      expect(result.checks).toHaveLength(2)
      expect(result.checks.map((c) => c.name)).toContain('Configuration')
      expect(result.checks.map((c) => c.name)).toContain('Storage')
    })

    it('should support different check name variants', async () => {
      await createConfigFile({
        organization: 'test',
        storage: [{ type: 'local' }],
      })

      const checker = new HealthChecker({ projectRoot: tempDir })
      const result = await checker.run(['configuration', 'types', 'type-registry'])

      expect(result.checks).toHaveLength(3) // config + types + types (duplicate allowed)
    })
  })

  describe('summarize', () => {
    it('should return healthy status when all pass', () => {
      const checker = new HealthChecker()
      const checks: HealthCheck[] = [
        { name: 'Test1', status: 'pass', message: 'OK' },
        { name: 'Test2', status: 'pass', message: 'OK' },
      ]

      const result = checker.summarize(checks)

      expect(result.summary.healthy).toBe(true)
      expect(result.summary.status).toBe('healthy')
      expect(result.summary.passed).toBe(2)
      expect(result.summary.warned).toBe(0)
      expect(result.summary.failed).toBe(0)
    })

    it('should return degraded status with warnings', () => {
      const checker = new HealthChecker()
      const checks: HealthCheck[] = [
        { name: 'Test1', status: 'pass', message: 'OK' },
        { name: 'Test2', status: 'warn', message: 'Warning' },
      ]

      const result = checker.summarize(checks)

      expect(result.summary.healthy).toBe(true) // no failures
      expect(result.summary.status).toBe('degraded')
      expect(result.summary.passed).toBe(1)
      expect(result.summary.warned).toBe(1)
    })

    it('should return unhealthy status with failures', () => {
      const checker = new HealthChecker()
      const checks: HealthCheck[] = [
        { name: 'Test1', status: 'pass', message: 'OK' },
        { name: 'Test2', status: 'fail', message: 'Failed' },
      ]

      const result = checker.summarize(checks)

      expect(result.summary.healthy).toBe(false)
      expect(result.summary.status).toBe('unhealthy')
      expect(result.summary.failed).toBe(1)
    })

    it('should count all check types correctly', () => {
      const checker = new HealthChecker()
      const checks: HealthCheck[] = [
        { name: 'Test1', status: 'pass', message: 'OK' },
        { name: 'Test2', status: 'pass', message: 'OK' },
        { name: 'Test3', status: 'warn', message: 'Warning' },
        { name: 'Test4', status: 'fail', message: 'Failed' },
      ]

      const result = checker.summarize(checks)

      expect(result.summary.total).toBe(4)
      expect(result.summary.passed).toBe(2)
      expect(result.summary.warned).toBe(1)
      expect(result.summary.failed).toBe(1)
    })

    it('should handle empty checks array', () => {
      const checker = new HealthChecker()
      const result = checker.summarize([])

      expect(result.summary.total).toBe(0)
      expect(result.summary.healthy).toBe(true)
      expect(result.summary.status).toBe('healthy')
    })
  })
})
