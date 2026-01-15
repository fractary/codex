/**
 * Storage manager
 *
 * Coordinates multiple storage providers and handles fallback logic.
 * The manager tries providers in priority order until one succeeds.
 */

import type { ResolvedReference } from '../references/index.js'
import { type StorageProvider, type FetchResult, type FetchOptions, type StorageProviderType } from './provider.js'
import { LocalStorage, type LocalStorageOptions } from './local.js'
import { GitHubStorage, type GitHubStorageOptions } from './github.js'
import { HttpStorage, type HttpStorageOptions } from './http.js'
import { S3ArchiveStorage, type S3ArchiveStorageOptions } from './s3-archive.js'
import { FilePluginStorage, type FilePluginStorageOptions } from './file-plugin.js'
import type { CodexConfig } from '../schemas/config.js'

/**
 * Storage manager configuration
 */
export interface StorageManagerConfig {
  /** Local storage options */
  local?: LocalStorageOptions
  /** GitHub storage options */
  github?: GitHubStorageOptions
  /** HTTP storage options */
  http?: HttpStorageOptions
  /** S3 Archive storage options */
  s3Archive?: S3ArchiveStorageOptions
  /** File plugin storage options */
  filePlugin?: FilePluginStorageOptions
  /** Provider priority order */
  priority?: StorageProviderType[]
  /** Whether to enable caching (handled by cache layer, not storage) */
  enableCaching?: boolean
  /** Full codex configuration (for auth and dependencies) */
  codexConfig?: CodexConfig
}

/**
 * Storage manager
 *
 * Manages multiple storage providers and routes fetch requests
 * to the appropriate provider based on reference type and availability.
 */
export class StorageManager {
  private providers: Map<StorageProviderType, StorageProvider> = new Map()
  private priority: StorageProviderType[]
  private codexConfig?: CodexConfig

  constructor(config: StorageManagerConfig = {}) {
    // Store codex config for auth resolution
    this.codexConfig = config.codexConfig

    // Initialize default providers
    this.providers.set('local', new LocalStorage(config.local))
    this.providers.set('github', new GitHubStorage(config.github))
    this.providers.set('http', new HttpStorage(config.http))

    // Initialize S3 Archive provider if configured
    if (config.s3Archive) {
      this.providers.set('s3-archive', new S3ArchiveStorage(config.s3Archive))
    }

    // Initialize File Plugin provider if configured
    if (config.filePlugin) {
      this.providers.set('file-plugin', new FilePluginStorage(config.filePlugin))
    }

    // Set priority order
    // file-plugin first (current project, no cache)
    // then local, s3-archive, github, http
    this.priority =
      config.priority ||
      (config.filePlugin && config.s3Archive
        ? ['file-plugin', 'local', 's3-archive', 'github', 'http']
        : config.filePlugin
          ? ['file-plugin', 'local', 'github', 'http']
          : config.s3Archive
            ? ['local', 's3-archive', 'github', 'http']
            : ['local', 'github', 'http'])
  }

  /**
   * Resolve authentication token for a reference
   *
   * Looks up dependency-specific authentication or falls back to default
   */
  private resolveToken(reference: ResolvedReference): string | undefined {
    if (!this.codexConfig) {
      return undefined
    }

    // Build dependency key: org/project
    const dependencyKey = `${reference.org}/${reference.project}`

    // Check for dependency-specific auth
    if (this.codexConfig.dependencies?.[dependencyKey]) {
      const dependency = this.codexConfig.dependencies[dependencyKey]

      // Look for token in any GitHub source
      for (const [sourceName, sourceConfig] of Object.entries(dependency.sources)) {
        if (sourceConfig.type === 'github') {
          // Check token_env first
          if (sourceConfig.token_env) {
            const token = process.env[sourceConfig.token_env]
            if (token) {
              return token
            }
          }

          // Check direct token (not recommended, but supported)
          if (sourceConfig.token) {
            return sourceConfig.token
          }
        }
      }
    }

    // Fall back to default GitHub auth
    const defaultTokenEnv = this.codexConfig.auth?.github?.default_token_env || 'GITHUB_TOKEN'
    return process.env[defaultTokenEnv]
  }

  /**
   * Resolve fetch options with authentication
   *
   * Merges reference-specific authentication with provided options
   */
  private resolveFetchOptions(reference: ResolvedReference, options?: FetchOptions): FetchOptions {
    const token = this.resolveToken(reference)

    return {
      ...options,
      token: options?.token || token, // Explicit option overrides resolved token
    }
  }

  /**
   * Register a custom storage provider
   */
  registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.type, provider)
  }

  /**
   * Remove a storage provider
   */
  removeProvider(type: StorageProviderType): boolean {
    return this.providers.delete(type)
  }

  /**
   * Get a provider by type
   */
  getProvider(type: StorageProviderType): StorageProvider | undefined {
    return this.providers.get(type)
  }

  /**
   * Get all registered providers
   */
  getProviders(): StorageProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Find the best provider for a reference
   */
  findProvider(reference: ResolvedReference): StorageProvider | null {
    for (const type of this.priority) {
      const provider = this.providers.get(type)
      if (provider && provider.canHandle(reference)) {
        return provider
      }
    }
    return null
  }

  /**
   * Fetch content for a reference
   *
   * Tries providers in priority order until one succeeds.
   * Automatically resolves authentication based on dependency configuration.
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    // Resolve authentication options
    const resolvedOptions = this.resolveFetchOptions(reference, options)
    const errors: Error[] = []

    for (const type of this.priority) {
      const provider = this.providers.get(type)
      if (!provider || !provider.canHandle(reference)) {
        continue
      }

      try {
        return await provider.fetch(reference, resolvedOptions)
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
        // Continue to next provider
      }
    }

    // All providers failed
    if (errors.length === 0) {
      throw new Error(`No provider can handle reference: ${reference.uri}`)
    }

    // Throw the first error with context about other failures
    const firstError = errors[0]
    if (firstError) {
      if (errors.length > 1) {
        throw new Error(`All providers failed for ${reference.uri}. First error: ${firstError.message}`)
      }
      throw firstError
    }

    throw new Error(`Unknown error fetching ${reference.uri}`)
  }

  /**
   * Check if content exists for a reference
   *
   * Returns true if any provider reports the content exists.
   * Automatically resolves authentication based on dependency configuration.
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    // Resolve authentication options
    const resolvedOptions = this.resolveFetchOptions(reference, options)

    for (const type of this.priority) {
      const provider = this.providers.get(type)
      if (!provider || !provider.canHandle(reference)) {
        continue
      }

      try {
        if (await provider.exists(reference, resolvedOptions)) {
          return true
        }
      } catch {
        // Continue to next provider
      }
    }

    return false
  }

  /**
   * Fetch content using a specific provider
   */
  async fetchWith(
    type: StorageProviderType,
    reference: ResolvedReference,
    options?: FetchOptions
  ): Promise<FetchResult> {
    const provider = this.providers.get(type)
    if (!provider) {
      throw new Error(`Provider not found: ${type}`)
    }

    return provider.fetch(reference, options)
  }

  /**
   * Fetch multiple references in parallel
   *
   * Automatically resolves authentication for each reference based on dependency configuration.
   */
  async fetchMany(
    references: ResolvedReference[],
    options?: FetchOptions
  ): Promise<Map<string, FetchResult | Error>> {
    const results = new Map<string, FetchResult | Error>()

    const promises = references.map(async (ref) => {
      try {
        // Each reference gets its own resolved options
        const result = await this.fetch(ref, options)
        results.set(ref.uri, result)
      } catch (error) {
        results.set(ref.uri, error instanceof Error ? error : new Error(String(error)))
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Get provider status (for diagnostics)
   */
  getStatus(): Array<{
    type: StorageProviderType
    name: string
    priority: number
  }> {
    return this.priority.map((type, index) => {
      const provider = this.providers.get(type)
      return {
        type,
        name: provider?.name || type,
        priority: index,
      }
    })
  }
}

/**
 * Create a storage manager with default configuration
 */
export function createStorageManager(config?: StorageManagerConfig): StorageManager {
  return new StorageManager(config)
}

/**
 * Default storage manager instance
 */
let defaultManager: StorageManager | null = null

/**
 * Get the default storage manager
 */
export function getDefaultStorageManager(): StorageManager {
  if (!defaultManager) {
    defaultManager = createStorageManager()
  }
  return defaultManager
}

/**
 * Set the default storage manager
 */
export function setDefaultStorageManager(manager: StorageManager): void {
  defaultManager = manager
}
