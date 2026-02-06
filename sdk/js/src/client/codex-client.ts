/**
 * CodexClient - High-level facade for Codex SDK
 *
 * Provides a unified interface for document fetching, cache management,
 * and type registry access. Used by both CLI and MCP server.
 */

import type { CacheManager, CacheStats } from '../cache/index.js'
import type { StorageManager } from '../storage/index.js'
import type { TypeRegistry } from '../types/index.js'
import type { UnifiedConfig, CodexYamlConfig } from '../core/yaml/index.js'

/**
 * Options for creating CodexClient
 */
export interface CodexClientOptions {
  /** Path to config file (default: .fractary/config.yaml) */
  configPath?: string
  /** Override cache directory */
  cacheDir?: string
  /** Override organization slug */
  organizationSlug?: string
}

/**
 * Options for fetch operations
 */
export interface ClientFetchOptions {
  /** Bypass cache and fetch fresh content */
  bypassCache?: boolean
  /** Override TTL for this fetch */
  ttl?: number
  /** Git branch to fetch from */
  branch?: string
}

/**
 * Result from fetch operation
 */
export interface ClientFetchResult {
  content: Buffer
  fromCache: boolean
  contentType?: string
  metadata?: {
    fetchedAt?: string
    expiresAt?: string
    contentLength?: number
  }
}

/**
 * Health check result
 */
export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string
}

/**
 * Unified Codex client
 *
 * Provides high-level operations for:
 * - Document fetching with integrated caching
 * - Cache management and invalidation
 * - Type registry access
 * - Health diagnostics
 */
export class CodexClient {
  private cache: CacheManager
  private storage: StorageManager
  private types: TypeRegistry
  private organization: string
  private unifiedConfig: UnifiedConfig | null

  /**
   * Private constructor - use CodexClient.create() instead
   */
  private constructor(
    cache: CacheManager,
    storage: StorageManager,
    types: TypeRegistry,
    organization: string,
    unifiedConfig: UnifiedConfig | null = null
  ) {
    this.cache = cache
    this.storage = storage
    this.types = types
    this.organization = organization
    this.unifiedConfig = unifiedConfig
  }

  /**
   * Create a new CodexClient instance
   *
   * Loads configuration, initializes storage/cache/type managers.
   *
   * @param options - Optional configuration
   * @returns Promise resolving to CodexClient instance
   */
  static async create(options?: CodexClientOptions): Promise<CodexClient> {
    const { readUnifiedConfig } = await import('../core/yaml/index.js')
    const { createStorageManager } = await import('../storage/index.js')
    const { CacheManager } = await import('../cache/manager.js')
    const { createDefaultRegistry } = await import('../types/index.js')
    const { CodexError, ConfigurationError } = await import('../errors/index.js')

    const configPath = options?.configPath || '.fractary/config.yaml'
    let unifiedConfig: UnifiedConfig = {}
    let codexConfig: CodexYamlConfig | undefined

    try {
      unifiedConfig = await readUnifiedConfig(configPath, { expandEnv: true })
      codexConfig = unifiedConfig.codex
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Non-default config was explicitly requested but failed to load
      if (options?.configPath) {
        throw new ConfigurationError(
          `Failed to load configuration from ${configPath}: ${errorMessage}`
        )
      }
      // Default config - missing is fine, parse errors should surface
      if (!errorMessage.includes('ENOENT')) {
        throw new ConfigurationError(
          `Config file exists but could not be parsed: ${errorMessage}`
        )
      }
    }

    try {
      const organization = options?.organizationSlug || codexConfig?.organization || ''
      const cacheDir = options?.cacheDir || codexConfig?.cacheDir || codexConfig?.cache?.cacheDir || '.fractary/codex/cache'

      // Build storage manager config
      const storageConfig: Record<string, unknown> = {}

      if (codexConfig?.storage && Array.isArray(codexConfig.storage)) {
        for (const provider of codexConfig.storage) {
          if (provider.type === 'github') {
            storageConfig.github = {
              token: provider.token || process.env.GITHUB_TOKEN,
              apiBaseUrl: provider.apiBaseUrl || 'https://api.github.com',
              branch: provider.branch || 'main',
            }
          } else if (provider.type === 'http') {
            storageConfig.http = {
              baseUrl: provider.baseUrl,
              headers: provider.headers,
              timeout: provider.timeout || 30000,
            }
          } else if (provider.type === 'local') {
            storageConfig.local = {
              basePath: provider.basePath || './knowledge',
              followSymlinks: provider.followSymlinks || false,
            }
          }
        }
      }

      // Add archive config if present
      if (codexConfig?.archive) {
        storageConfig.s3Archive = {
          projects: codexConfig.archive.projects || {},
          fractaryCli: process.env.FRACTARY_CLI || 'fractary',
        }
      }

      // Add file plugin config if present
      if (unifiedConfig.file) {
        storageConfig.filePlugin = {
          config: unifiedConfig,
        }
      }

      const storage = createStorageManager(storageConfig as any)

      // Initialize cache manager
      const cache = new CacheManager({
        cacheDir,
        defaultTtl: codexConfig?.cache?.defaultTtl || 86400,
        maxMemoryEntries: codexConfig?.cache?.maxMemoryEntries || 100,
        maxMemorySize: codexConfig?.cache?.maxMemorySize || 50 * 1024 * 1024,
        enablePersistence: codexConfig?.cache?.enablePersistence !== false,
      })

      // Connect storage to cache
      cache.setStorageManager(storage)

      // Initialize type registry with built-in types
      const types = createDefaultRegistry()

      // Load and register custom types from config
      if (codexConfig?.types?.custom) {
        for (const [name, customType] of Object.entries(codexConfig.types.custom)) {
          const ct = customType as any
          types.register({
            name,
            description: ct.description || `Custom type: ${name}`,
            patterns: ct.patterns || [],
            defaultTtl: ct.defaultTtl || 86400,
            archiveAfterDays: ct.archiveAfterDays !== undefined ? ct.archiveAfterDays : null,
            archiveStorage: ct.archiveStorage || null,
          })
        }
      }

      return new CodexClient(cache, storage, types, organization, unifiedConfig)
    } catch (error) {
      if (error instanceof CodexError) {
        throw error
      }
      throw new CodexError(
        `Failed to initialize CodexClient: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Fetch a document by codex:// URI
   */
  async fetch(uri: string, options?: ClientFetchOptions): Promise<ClientFetchResult> {
    const { validateUri, resolveReference } = await import('../references/index.js')
    const { CodexError } = await import('../errors/index.js')

    if (!validateUri(uri)) {
      throw new CodexError(`Invalid codex URI: ${uri}`)
    }

    const resolved = resolveReference(uri)
    if (!resolved) {
      throw new CodexError(`Failed to resolve URI: ${uri}`)
    }

    try {
      const isFilePlugin = resolved.isCurrentProject && resolved.sourceType === 'file-plugin'

      if (options?.bypassCache) {
        const result = await this.storage.fetch(resolved, { branch: options.branch })
        if (!isFilePlugin) {
          await this.cache.set(uri, result)
        }
        return {
          content: result.content,
          fromCache: false,
          contentType: result.contentType,
          metadata: {
            fetchedAt: new Date().toISOString(),
            contentLength: result.size,
          },
        }
      }

      const result = await this.cache.get(resolved, {
        ttl: options?.ttl,
        branch: options?.branch,
      })

      return {
        content: result.content,
        fromCache: true,
        contentType: result.contentType,
        metadata: {
          contentLength: result.size,
        },
      }
    } catch (error) {
      throw new CodexError(
        `Failed to fetch ${uri}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cache.invalidate(pattern)
    } else {
      await this.cache.clear()
    }
  }

  /**
   * Invalidate cache entries matching a regex pattern
   * @returns Number of entries cleared
   */
  async invalidateCachePattern(regex: RegExp): Promise<number> {
    return this.cache.invalidatePattern(regex)
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats & { memoryEntries: number; memorySize: number }> {
    return this.cache.getStats()
  }

  /**
   * Run health checks
   */
  async getHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = []

    // Check cache
    try {
      const stats = await this.cache.getStats()
      if (stats.entryCount === 0) {
        checks.push({
          name: 'Cache',
          status: 'warn',
          message: 'Cache is empty',
          details: 'Fetch some documents to populate cache',
        })
      } else {
        const healthPercent = (stats.freshCount / stats.entryCount) * 100
        if (healthPercent < 50) {
          checks.push({
            name: 'Cache',
            status: 'warn',
            message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
            details: `${stats.expiredCount} expired, ${stats.staleCount} stale`,
          })
        } else {
          const { formatBytes } = await import('../core/utils/index.js')
          checks.push({
            name: 'Cache',
            status: 'pass',
            message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
            details: `${formatBytes(stats.totalSize)} total`,
          })
        }
      }
    } catch (error: any) {
      checks.push({
        name: 'Cache',
        status: 'fail',
        message: 'Cache check failed',
        details: error.message,
      })
    }

    // Check storage
    try {
      const filePluginProvider = this.storage.getProvider('file-plugin')
      const providers = this.storage.getProviders()
      checks.push({
        name: 'Storage',
        status: 'pass',
        message: `${providers.length} provider(s) available`,
        details: filePluginProvider ? 'File plugin active' : undefined,
      })
    } catch (error: any) {
      checks.push({
        name: 'Storage',
        status: 'fail',
        message: 'Storage check failed',
        details: error.message,
      })
    }

    // Check type registry
    try {
      const allTypes = this.types.list()
      const builtinCount = allTypes.filter(t => this.types.isBuiltIn(t.name)).length
      const customCount = allTypes.length - builtinCount
      checks.push({
        name: 'Type Registry',
        status: 'pass',
        message: `${allTypes.length} types registered`,
        details: `${builtinCount} built-in, ${customCount} custom`,
      })
    } catch (error: any) {
      checks.push({
        name: 'Type Registry',
        status: 'fail',
        message: 'Type registry check failed',
        details: error.message,
      })
    }

    return checks
  }

  /**
   * Get the type registry
   */
  getTypeRegistry(): TypeRegistry {
    return this.types
  }

  /**
   * Get the cache manager (for advanced operations)
   */
  getCacheManager(): CacheManager {
    return this.cache
  }

  /**
   * Get the storage manager (for advanced operations)
   */
  getStorageManager(): StorageManager {
    return this.storage
  }

  /**
   * Get the organization slug
   */
  getOrganization(): string {
    return this.organization
  }

  /**
   * Get the unified config (for file sources list, etc.)
   */
  getUnifiedConfig(): UnifiedConfig | null {
    return this.unifiedConfig
  }
}

/**
 * Create a CodexClient instance (factory function)
 */
export async function createCodexClient(options?: CodexClientOptions): Promise<CodexClient> {
  return CodexClient.create(options)
}
