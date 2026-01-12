/**
 * Storage provider interface and types
 *
 * Defines the contract for storage providers that can fetch
 * content from various sources (local, GitHub, HTTP, etc.)
 */

import type { ResolvedReference } from '../references/index.js'

/**
 * Supported storage provider types
 */
export type StorageProviderType = 'local' | 'github' | 'http' | 's3' | 's3-archive' | 'r2' | 'gcs' | 'drive'

/**
 * Result of a fetch operation
 */
export interface FetchResult {
  /** Fetched content as Buffer */
  content: Buffer
  /** Content type (MIME type) */
  contentType: string
  /** Content size in bytes */
  size: number
  /** Source identifier (e.g., 'github', 'local') */
  source: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Options for fetch operations
 */
export interface FetchOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Maximum number of retries */
  maxRetries?: number
  /** Authentication token */
  token?: string
  /** Branch to fetch from (for git-based providers) */
  branch?: string
  /** Whether to follow redirects */
  followRedirects?: boolean
  /** Maximum content size in bytes */
  maxSize?: number
}

/**
 * Storage provider interface
 *
 * All storage providers must implement this interface.
 */
export interface StorageProvider {
  /** Provider name (e.g., 'github', 'local') */
  readonly name: string
  /** Provider type */
  readonly type: StorageProviderType

  /**
   * Fetch content for a resolved reference
   *
   * @param reference - The resolved reference to fetch
   * @param options - Fetch options
   * @returns The fetch result
   * @throws Error if fetch fails
   */
  fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult>

  /**
   * Check if content exists at the reference
   *
   * @param reference - The resolved reference to check
   * @param options - Fetch options
   * @returns true if content exists
   */
  exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean>

  /**
   * Check if this provider can handle the given reference
   *
   * @param reference - The resolved reference
   * @returns true if this provider can handle the reference
   */
  canHandle(reference: ResolvedReference): boolean
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  /** Provider type */
  type: StorageProviderType
  /** Provider-specific options */
  options?: Record<string, unknown>
  /** Default timeout */
  timeout?: number
  /** Default max retries */
  maxRetries?: number
  /** Authentication configuration */
  auth?: {
    /** Environment variable containing the token */
    tokenEnv?: string
    /** Static token (not recommended) */
    token?: string
  }
}

/**
 * Default fetch options
 */
export const DEFAULT_FETCH_OPTIONS: Required<FetchOptions> = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  token: '',
  branch: 'main',
  followRedirects: true,
  maxSize: 10 * 1024 * 1024, // 10MB
}

/**
 * Merge fetch options with defaults
 *
 * @param options - User-provided options
 * @returns Merged options with defaults
 */
export function mergeFetchOptions(options?: FetchOptions): Required<FetchOptions> {
  return {
    ...DEFAULT_FETCH_OPTIONS,
    ...options,
  }
}

/**
 * Detect content type from file extension
 *
 * @param path - File path
 * @returns MIME type
 */
export function detectContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    yaml: 'application/x-yaml',
    yml: 'application/x-yaml',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    py: 'text/x-python',
    rb: 'text/x-ruby',
    go: 'text/x-go',
    rs: 'text/x-rust',
    java: 'text/x-java',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    h: 'text/x-c',
    hpp: 'text/x-c++',
    sh: 'application/x-sh',
    bash: 'application/x-sh',
    zsh: 'application/x-sh',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}
