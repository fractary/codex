/**
 * CodexClient - Unified client wrapper for Codex SDK
 *
 * Following the pattern from the CLI Integration Guide:
 * https://github.com/fractary/codex/blob/main/docs/guides/cli-integration.md
 *
 * This wrapper encapsulates CacheManager, StorageManager, and TypeRegistry,
 * providing a clean interface for CLI commands.
 */

// Type-only imports
import type {
  CacheManager,
  StorageManager,
  TypeRegistry,
  CacheStats,
  FetchResult as SDKFetchResult,
  ParsedReference,
  ResolvedReference,
  FetchOptions as SDKFetchOptions,
} from '@fractary/codex';
// Dynamic imports for config utilities to avoid loading js-yaml at module time
// import { readYamlConfig } from '../config/migrate-config';
// import { resolveEnvVarsInConfig } from '../config/config-types';
import * as path from 'path';

/**
 * Options for creating CodexClient
 */
export interface CodexClientOptions {
  cacheDir?: string;
  organizationSlug?: string;
}

/**
 * Options for fetch operations
 */
export interface FetchOptions {
  bypassCache?: boolean;
  ttl?: number;
}

/**
 * Result from fetch operation
 */
export interface FetchResult {
  content: Buffer;
  fromCache: boolean;
  metadata?: {
    fetchedAt?: string;
    expiresAt?: string;
    contentLength?: number;
  };
}

/**
 * Unified Codex client
 *
 * Provides high-level operations for:
 * - Document fetching with integrated caching
 * - Cache management and invalidation
 * - Type registry access
 */
export class CodexClient {
  private cache: CacheManager;
  private storage: StorageManager;
  private types: TypeRegistry;
  private organization: string;

  /**
   * Private constructor - use CodexClient.create() instead
   */
  private constructor(
    cache: CacheManager,
    storage: StorageManager,
    types: TypeRegistry,
    organization: string
  ) {
    this.cache = cache;
    this.storage = storage;
    this.types = types;
    this.organization = organization;
  }

  /**
   * Create a new CodexClient instance
   *
   * @param options - Optional configuration
   * @returns Promise resolving to CodexClient instance
   *
   * @example
   * ```typescript
   * const client = await CodexClient.create();
   * ```
   */
  static async create(options?: CodexClientOptions): Promise<CodexClient> {
    // Dynamic import of SDK
    const {
      CacheManager,
      createStorageManager,
      createDefaultRegistry,
      CodexError,
      ConfigurationError
    } = await import('@fractary/codex');

    // Dynamic import of config utilities (to avoid loading js-yaml at module time)
    const { readYamlConfig } = await import('../config/migrate-config');
    const { resolveEnvVarsInConfig } = await import('../config/config-types');

    try {
      // Load YAML configuration (unified config path)
      const configPath = path.join(process.cwd(), '.fractary', 'config.yaml');
      let config;

      try {
        config = await readYamlConfig(configPath);
        // Resolve environment variables in config
        config = resolveEnvVarsInConfig(config);
      } catch (error) {
        throw new ConfigurationError(
          `Failed to load configuration from ${configPath}. Run "fractary codex init" to create a configuration.`
        );
      }

      const organization = options?.organizationSlug || config.organization;
      const cacheDir = options?.cacheDir || config.cacheDir || '.codex-cache';

      // Build storage manager config from YAML storage providers
      const storageConfig: any = {};

      if (config.storage && Array.isArray(config.storage)) {
        for (const provider of config.storage) {
          if (provider.type === 'github') {
            storageConfig.github = {
              token: provider.token || process.env.GITHUB_TOKEN,
              apiBaseUrl: provider.apiBaseUrl || 'https://api.github.com',
              branch: provider.branch || 'main'
            };
          } else if (provider.type === 'http') {
            storageConfig.http = {
              baseUrl: provider.baseUrl,
              headers: provider.headers,
              timeout: provider.timeout || 30000
            };
          } else if (provider.type === 'local') {
            storageConfig.local = {
              basePath: provider.basePath || './knowledge',
              followSymlinks: provider.followSymlinks || false
            };
          }
        }
      }

      // Initialize storage manager
      const storage = createStorageManager(storageConfig);

      // Initialize cache manager
      const cache = new CacheManager({
        cacheDir,
        defaultTtl: 86400, // 24 hours
        maxMemoryEntries: 100,
        maxMemorySize: 50 * 1024 * 1024, // 50MB
        enablePersistence: true
      });

      // Connect storage to cache
      cache.setStorageManager(storage);

      // Initialize type registry with built-in types
      const types = createDefaultRegistry();

      // Load and register custom types from config
      if (config.types?.custom) {
        for (const [name, customType] of Object.entries(config.types.custom)) {
          const ct = customType as any; // Type from YAML config
          types.register({
            name,
            description: ct.description || `Custom type: ${name}`,
            patterns: ct.patterns || [],
            defaultTtl: ct.defaultTtl || 86400,
            archiveAfterDays: ct.archiveAfterDays !== undefined ? ct.archiveAfterDays : null,
            archiveStorage: ct.archiveStorage || null
          });
        }
      }

      return new CodexClient(cache, storage, types, organization);
    } catch (error) {
      if (error instanceof CodexError) {
        throw error;
      }
      throw new CodexError(
        `Failed to initialize CodexClient: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch a document by codex:// URI
   *
   * This method:
   * 1. Validates the URI format
   * 2. Resolves the URI to a reference
   * 3. Uses CacheManager.get() which handles cache-first fetch
   *
   * @param uri - Codex URI (e.g., codex://org/project/path/to/file.md)
   * @param options - Fetch options
   * @returns Promise resolving to fetch result
   *
   * @throws {CodexError} If URI format is invalid or fetch fails
   *
   * @example
   * ```typescript
   * const result = await client.fetch('codex://fractary/codex/docs/README.md');
   * console.log(result.content.toString());
   * ```
   */
  async fetch(uri: string, options?: FetchOptions): Promise<FetchResult> {
    // Dynamic import of SDK functions
    const { validateUri, resolveReference, CodexError } = await import('@fractary/codex');

    // Validate URI early
    if (!validateUri(uri)) {
      throw new CodexError(`Invalid codex URI: ${uri}`);
    }

    // Resolve URI to reference (with cache path)
    const resolved = resolveReference(uri);
    if (!resolved) {
      throw new CodexError(`Failed to resolve URI: ${uri}`);
    }

    try {
      // If bypassing cache, fetch directly from storage
      if (options?.bypassCache) {
        const result = await this.storage.fetch(resolved);
        return {
          content: result.content,
          fromCache: false,
          metadata: {
            fetchedAt: new Date().toISOString(),
            contentLength: result.size
          }
        };
      }

      // Use CacheManager.get() which handles cache-first fetch
      const result = await this.cache.get(resolved, {
        ttl: options?.ttl
      });

      return {
        content: result.content,
        fromCache: true, // CacheManager.get handles cache logic
        metadata: {
          contentLength: result.size
        }
      };
    } catch (error) {
      throw new CodexError(
        `Failed to fetch ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Invalidate cache entries
   *
   * @param pattern - Optional glob pattern to match entries
   *                  If not provided, clears all entries
   *
   * @example
   * ```typescript
   * // Clear all cache
   * await client.invalidateCache();
   *
   * // Clear specific URI
   * await client.invalidateCache('codex://fractary/codex/docs/README.md');
   * ```
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cache.invalidate(pattern);
    } else {
      await this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Promise resolving to cache stats
   *
   * @example
   * ```typescript
   * const stats = await client.getCacheStats();
   * console.log(`Cache entries: ${stats.totalEntries}`);
   * console.log(`Total size: ${stats.totalSize}`);
   * ```
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.cache.getStats();
  }

  /**
   * Get the type registry
   *
   * Provides access to built-in and custom artifact types
   *
   * @returns TypeRegistry instance
   *
   * @example
   * ```typescript
   * const registry = client.getTypeRegistry();
   * const types = registry.list();
   * ```
   */
  getTypeRegistry(): TypeRegistry {
    return this.types;
  }

  /**
   * Get the cache manager (for advanced operations)
   *
   * @returns CacheManager instance
   */
  getCacheManager(): CacheManager {
    return this.cache;
  }

  /**
   * Get the storage manager (for advanced operations)
   *
   * @returns StorageManager instance
   */
  getStorageManager(): StorageManager {
    return this.storage;
  }

  /**
   * Get the organization slug
   *
   * @returns Organization slug string
   */
  getOrganization(): string {
    return this.organization;
  }
}

// Re-export SDK error classes for convenience
export {
  CodexError,
  ConfigurationError,
  ValidationError,
  PermissionDeniedError
} from '@fractary/codex';
