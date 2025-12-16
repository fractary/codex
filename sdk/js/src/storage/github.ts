/**
 * GitHub storage provider
 *
 * Fetches content from GitHub repositories using the GitHub API
 * or raw content URLs. Supports both public and private repos.
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
 * Options for creating a GitHub storage provider
 */
export interface GitHubStorageOptions {
  /** GitHub API token for authentication */
  token?: string
  /** Environment variable containing the token */
  tokenEnv?: string
  /** Base URL for GitHub API (default: https://api.github.com) */
  apiBaseUrl?: string
  /** Base URL for raw content (default: https://raw.githubusercontent.com) */
  rawBaseUrl?: string
  /** Default branch to use (default: main) */
  defaultBranch?: string
}

/**
 * GitHub API response for file content
 */
interface GitHubContentResponse {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir'
  content?: string
  encoding?: string
  download_url?: string
}

/**
 * GitHub storage provider
 *
 * Handles fetching content from GitHub repositories.
 * Uses raw.githubusercontent.com for public repos and
 * GitHub API for private repos (with authentication).
 */
export class GitHubStorage implements StorageProvider {
  readonly name = 'github'
  readonly type = 'github' as const

  private apiBaseUrl: string
  private rawBaseUrl: string
  private defaultBranch: string
  private token?: string

  constructor(options: GitHubStorageOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.github.com'
    this.rawBaseUrl = options.rawBaseUrl || 'https://raw.githubusercontent.com'
    this.defaultBranch = options.defaultBranch || 'main'

    // Get token from options or environment
    this.token = options.token || (options.tokenEnv ? process.env[options.tokenEnv] : undefined)
    if (!this.token) {
      // Try common environment variables
      this.token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    }
  }

  /**
   * Check if this provider can handle the reference
   *
   * GitHub provider handles references that are NOT in the current project
   * (those need to be fetched from GitHub).
   */
  canHandle(reference: ResolvedReference): boolean {
    return !reference.isCurrentProject
  }

  /**
   * Fetch content from GitHub
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    const opts = mergeFetchOptions(options)
    const token = opts.token || this.token
    const branch = opts.branch || this.defaultBranch

    if (!reference.path) {
      throw new Error(`No path specified for reference: ${reference.uri}`)
    }

    // Try raw content first (faster, works for public repos)
    try {
      return await this.fetchRaw(reference, branch, opts, token)
    } catch (error) {
      // If raw fetch fails and we have a token, try API
      if (token) {
        return await this.fetchApi(reference, branch, opts, token)
      }
      throw error
    }
  }

  /**
   * Fetch using raw.githubusercontent.com
   */
  private async fetchRaw(
    reference: ResolvedReference,
    branch: string,
    opts: Required<FetchOptions>,
    token?: string
  ): Promise<FetchResult> {
    const url = `${this.rawBaseUrl}/${reference.org}/${reference.project}/${branch}/${reference.path}`

    const headers: Record<string, string> = {
      'User-Agent': 'fractary-codex',
    }

    if (token) {
      headers['Authorization'] = `token ${token}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout)

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: opts.followRedirects ? 'follow' : 'manual',
      })

      if (!response.ok) {
        throw new Error(`GitHub raw fetch failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const content = Buffer.from(arrayBuffer)

      if (content.length > opts.maxSize) {
        throw new Error(`Content too large: ${content.length} bytes (max: ${opts.maxSize} bytes)`)
      }

      return {
        content,
        contentType: response.headers.get('content-type') || detectContentType(reference.path),
        size: content.length,
        source: 'github-raw',
        metadata: {
          url,
          branch,
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Fetch using GitHub API (for private repos)
   */
  private async fetchApi(
    reference: ResolvedReference,
    branch: string,
    opts: Required<FetchOptions>,
    token: string
  ): Promise<FetchResult> {
    const url = `${this.apiBaseUrl}/repos/${reference.org}/${reference.project}/contents/${reference.path}?ref=${branch}`

    const headers: Record<string, string> = {
      'User-Agent': 'fractary-codex',
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout)

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`GitHub API fetch failed: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as GitHubContentResponse

      if (data.type !== 'file') {
        throw new Error(`Reference is not a file: ${reference.uri}`)
      }

      let content: Buffer

      if (data.content && data.encoding === 'base64') {
        // Content is base64 encoded in API response
        content = Buffer.from(data.content, 'base64')
      } else if (data.download_url) {
        // Fetch from download URL
        const downloadResponse = await fetch(data.download_url, {
          headers: { 'User-Agent': 'fractary-codex' },
          signal: controller.signal,
        })
        const arrayBuffer = await downloadResponse.arrayBuffer()
        content = Buffer.from(arrayBuffer)
      } else {
        throw new Error(`No content available for: ${reference.uri}`)
      }

      if (content.length > opts.maxSize) {
        throw new Error(`Content too large: ${content.length} bytes (max: ${opts.maxSize} bytes)`)
      }

      return {
        content,
        contentType: detectContentType(reference.path),
        size: content.length,
        source: 'github-api',
        metadata: {
          sha: data.sha,
          url,
          branch,
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Check if file exists on GitHub
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    const opts = mergeFetchOptions(options)
    const token = opts.token || this.token
    const branch = opts.branch || this.defaultBranch

    if (!reference.path) {
      return false
    }

    // Try HEAD request to raw URL
    const url = `${this.rawBaseUrl}/${reference.org}/${reference.project}/${branch}/${reference.path}`

    const headers: Record<string, string> = {
      'User-Agent': 'fractary-codex',
    }

    if (token) {
      headers['Authorization'] = `token ${token}`
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers,
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get repository metadata
   */
  async getRepoInfo(
    org: string,
    project: string
  ): Promise<{
    defaultBranch: string
    private: boolean
    size: number
  } | null> {
    const url = `${this.apiBaseUrl}/repos/${org}/${project}`

    const headers: Record<string, string> = {
      'User-Agent': 'fractary-codex',
      Accept: 'application/vnd.github.v3+json',
    }

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as {
        default_branch: string
        private: boolean
        size: number
      }

      return {
        defaultBranch: data.default_branch,
        private: data.private,
        size: data.size,
      }
    } catch {
      return null
    }
  }
}

/**
 * Create a GitHub storage provider
 */
export function createGitHubStorage(options?: GitHubStorageOptions): GitHubStorage {
  return new GitHubStorage(options)
}
