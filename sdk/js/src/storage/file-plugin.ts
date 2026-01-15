/**
 * File plugin storage provider
 *
 * Provides storage integration with the file plugin (Fractary Core)
 * for current project artifact access. Reads directly from local filesystem
 * without caching for optimal freshness during active development.
 *
 * Based on SPEC-20260115: Codex-File Plugin Integration
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { StorageProvider, FetchResult, FetchOptions } from './provider.js'
import type { ResolvedReference } from '../references/index.js'
import type { UnifiedConfig } from '../schemas/config.js'
import { FileSourceResolver, type ResolvedFileSource } from '../file-integration/index.js'

/**
 * File plugin storage configuration
 */
export interface FilePluginStorageOptions {
  /** Unified configuration */
  config: UnifiedConfig
  /** Enable S3 fallback suggestions */
  enableS3Fallback?: boolean
  /** Base directory for resolving relative paths */
  baseDir?: string
}

/**
 * File plugin storage provider
 *
 * Handles file reads for current project file plugin sources.
 * Does NOT cache results - always reads fresh from disk.
 */
export class FilePluginStorage implements StorageProvider {
  readonly name = 'file-plugin'
  readonly type = 'local' as const // Reuse local type for compatibility

  private sourceResolver: FileSourceResolver
  private baseDir: string

  constructor(private options: FilePluginStorageOptions) {
    this.sourceResolver = new FileSourceResolver(options.config)
    this.baseDir = options.baseDir || process.cwd()
  }

  /**
   * Check if this provider can handle the reference
   *
   * Only handles:
   * - Current project references
   * - With sourceType === 'file-plugin'
   *
   * @param reference - Resolved reference
   * @returns True if this provider can handle the reference
   */
  canHandle(reference: ResolvedReference): boolean {
    return reference.isCurrentProject && reference.sourceType === 'file-plugin'
  }

  /**
   * Fetch content for a reference
   *
   * Reads from local filesystem based on the resolved local path.
   * If file not found and S3 fallback is enabled, throws helpful error.
   *
   * @param reference - Resolved reference
   * @param options - Fetch options (unused for local reads)
   * @returns Fetch result with content
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    if (!reference.localPath) {
      throw new Error(`File plugin reference missing localPath: ${reference.uri}`)
    }

    if (!reference.filePluginSource) {
      throw new Error(`File plugin reference missing source name: ${reference.uri}`)
    }

    // Resolve absolute path
    const absolutePath = path.isAbsolute(reference.localPath)
      ? reference.localPath
      : path.join(this.baseDir, reference.localPath)

    try {
      // Read file content
      const content = await fs.readFile(absolutePath)

      // Detect content type from extension
      const contentType = this.detectContentType(absolutePath)

      return {
        content,
        contentType,
        size: content.length,
        source: 'file-plugin',
        metadata: {
          filePluginSource: reference.filePluginSource,
          localPath: absolutePath,
        },
      }
    } catch (error) {
      // File not found - provide helpful error message
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const source = this.sourceResolver.resolveSource(reference.filePluginSource)
        throw this.createFileNotFoundError(reference, source)
      }

      // Other errors - rethrow
      throw error
    }
  }

  /**
   * Check if a reference exists
   *
   * @param reference - Resolved reference
   * @param options - Fetch options (unused)
   * @returns True if file exists
   */
  async exists(reference: ResolvedReference, options?: FetchOptions): Promise<boolean> {
    if (!reference.localPath) {
      return false
    }

    const absolutePath = path.isAbsolute(reference.localPath)
      ? reference.localPath
      : path.join(this.baseDir, reference.localPath)

    try {
      await fs.access(absolutePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Detect content type from file extension
   */
  private detectContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()

    const mimeTypes: Record<string, string> = {
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.html': 'text/html',
      '.xml': 'application/xml',
      '.log': 'text/plain',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
      '.sh': 'application/x-sh',
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Create a helpful error message when file is not found
   */
  private createFileNotFoundError(
    reference: ResolvedReference,
    source: ResolvedFileSource | null
  ): Error {
    const messages: string[] = [
      `File not found: ${reference.localPath}`,
      '',
    ]

    if (source && this.options.enableS3Fallback !== false) {
      messages.push(`This file may be in cloud storage (${source.config.type}).`)
      messages.push('')
      messages.push('To fetch from cloud storage, run:')
      messages.push(`  file pull ${reference.filePluginSource}`)
      messages.push('')
      messages.push('Or sync all sources:')
      messages.push(`  file sync`)
    } else {
      messages.push('Please ensure the file exists locally or pull it from cloud storage.')
    }

    const error = new Error(messages.join('\n'))
    error.name = 'FilePluginFileNotFoundError'
    return error
  }
}
