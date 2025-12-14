/**
 * Storage module
 *
 * Provides storage providers for fetching content from various sources:
 * - Local filesystem (current project)
 * - GitHub repositories
 * - HTTP/HTTPS URLs
 *
 * The storage manager coordinates providers and handles fallback logic.
 *
 * @example
 * ```typescript
 * import { createStorageManager, resolveReference } from '@fractary/codex'
 *
 * const storage = createStorageManager({
 *   github: { token: process.env.GITHUB_TOKEN }
 * })
 *
 * const ref = resolveReference('codex://org/project/docs/README.md')
 * if (ref) {
 *   const result = await storage.fetch(ref)
 *   console.log(result.content.toString())
 * }
 * ```
 */

// Provider interface and types
export {
  type StorageProvider,
  type StorageProviderType,
  type StorageProviderConfig,
  type FetchResult,
  type FetchOptions,
  DEFAULT_FETCH_OPTIONS,
  mergeFetchOptions,
  detectContentType,
} from './provider.js'

// Local storage provider
export { LocalStorage, createLocalStorage, type LocalStorageOptions } from './local.js'

// GitHub storage provider
export { GitHubStorage, createGitHubStorage, type GitHubStorageOptions } from './github.js'

// HTTP storage provider
export { HttpStorage, createHttpStorage, type HttpStorageOptions } from './http.js'

// Storage manager
export {
  StorageManager,
  createStorageManager,
  getDefaultStorageManager,
  setDefaultStorageManager,
  type StorageManagerConfig,
} from './manager.js'
