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
  /** Provider priority order */
  priority?: StorageProviderType[]
  /** Whether to enable caching (handled by cache layer, not storage) */
  enableCaching?: boolean
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

  constructor(config: StorageManagerConfig = {}) {
    // Initialize default providers
    this.providers.set('local', new LocalStorage(config.local))
    this.providers.set('github', new GitHubStorage(config.github))
    this.providers.set('http', new HttpStorage(config.http))

    // Initialize S3 Archive provider if configured
    if (config.s3Archive) {
      this.providers.set('s3-archive', new S3ArchiveStorage(config.s3Archive))
    }

    // Set priority order (local first, then archive, then github, then http)
    this.priority = config.priority || (config.s3Archive ? ['local', 's3-archive', 'github', 'http'] : ['local', 'github', 'http'])
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
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    const errors: Error[] = []

    for (const type of this.priority) {
      const provider = this.providers.get(type)
      if (!provider || !provider.canHandle(reference)) {
        continue
      }

      try {
        return await provider.fetch(reference, options)
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
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    for (const type of this.priority) {
      const provider = this.providers.get(type)
      if (!provider || !provider.canHandle(reference)) {
        continue
      }

      try {
        if (await provider.exists(reference, options)) {
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
   */
  async fetchMany(
    references: ResolvedReference[],
    options?: FetchOptions
  ): Promise<Map<string, FetchResult | Error>> {
    const results = new Map<string, FetchResult | Error>()

    const promises = references.map(async (ref) => {
      try {
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
