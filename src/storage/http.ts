/**
 * HTTP storage provider
 *
 * Fetches content from HTTP/HTTPS URLs. Used for external
 * documentation, APIs, and other web resources.
 */

import type { ResolvedReference } from '../references/index.js'
import {
  type StorageProvider,
  type FetchResult,
  type FetchOptions,
  detectContentType,
  mergeFetchOptions,
} from './provider.js'

/**
 * Options for creating an HTTP storage provider
 */
export interface HttpStorageOptions {
  /** Default timeout in milliseconds */
  timeout?: number
  /** Maximum content size in bytes */
  maxSize?: number
  /** Custom headers to include in requests */
  headers?: Record<string, string>
  /** User agent string */
  userAgent?: string
}

/**
 * HTTP storage provider
 *
 * Generic provider for fetching content from HTTP/HTTPS URLs.
 * This is a fallback provider for external resources.
 */
export class HttpStorage implements StorageProvider {
  readonly name = 'http'
  readonly type = 'http' as const

  private defaultTimeout: number
  private defaultMaxSize: number
  private defaultHeaders: Record<string, string>

  constructor(options: HttpStorageOptions = {}) {
    this.defaultTimeout = options.timeout || 30000
    this.defaultMaxSize = options.maxSize || 10 * 1024 * 1024 // 10MB
    this.defaultHeaders = {
      'User-Agent': options.userAgent || 'fractary-codex',
      ...options.headers,
    }
  }

  /**
   * Check if this provider can handle the reference
   *
   * HTTP provider is a fallback - it can handle any reference
   * but should have lower priority than specialized providers.
   */
  canHandle(_reference: ResolvedReference): boolean {
    // HTTP provider is a fallback, so it can handle anything
    // but let other providers take precedence
    return true
  }

  /**
   * Fetch content from HTTP URL
   *
   * This method constructs a URL from the reference and fetches it.
   * The URL pattern is: https://raw.githubusercontent.com/{org}/{project}/{branch}/{path}
   *
   * For custom URL schemes, use the fetchUrl method directly.
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    const opts = mergeFetchOptions(options)
    const branch = opts.branch || 'main'

    if (!reference.path) {
      throw new Error(`No path specified for reference: ${reference.uri}`)
    }

    // Construct URL (GitHub raw content as default)
    const url = `https://raw.githubusercontent.com/${reference.org}/${reference.project}/${branch}/${reference.path}`

    return this.fetchUrl(url, opts)
  }

  /**
   * Fetch content from any URL
   */
  async fetchUrl(url: string, options?: FetchOptions): Promise<FetchResult> {
    const opts = mergeFetchOptions(options)
    const timeout = opts.timeout || this.defaultTimeout
    const maxSize = opts.maxSize || this.defaultMaxSize

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    }

    if (opts.token) {
      headers['Authorization'] = `Bearer ${opts.token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: opts.followRedirects ? 'follow' : 'manual',
      })

      if (!response.ok) {
        throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`)
      }

      // Check content length header first
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        throw new Error(`Content too large: ${contentLength} bytes (max: ${maxSize} bytes)`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const content = Buffer.from(arrayBuffer)

      if (content.length > maxSize) {
        throw new Error(`Content too large: ${content.length} bytes (max: ${maxSize} bytes)`)
      }

      // Extract filename from URL for content type detection
      const pathname = new URL(url).pathname
      const filename = pathname.split('/').pop() || ''

      return {
        content,
        contentType: response.headers.get('content-type') || detectContentType(filename),
        size: content.length,
        source: 'http',
        metadata: {
          url,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check if URL exists (HEAD request)
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    const opts = mergeFetchOptions(options)
    const branch = opts.branch || 'main'

    if (!reference.path) {
      return false
    }

    const url = `https://raw.githubusercontent.com/${reference.org}/${reference.project}/${branch}/${reference.path}`

    return this.urlExists(url, opts)
  }

  /**
   * Check if any URL exists
   */
  async urlExists(url: string, options?: FetchOptions): Promise<boolean> {
    const opts = mergeFetchOptions(options)
    const timeout = opts.timeout || this.defaultTimeout

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    }

    if (opts.token) {
      headers['Authorization'] = `Bearer ${opts.token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      })

      return response.ok
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Create an HTTP storage provider
 */
export function createHttpStorage(options?: HttpStorageOptions): HttpStorage {
  return new HttpStorage(options)
}
