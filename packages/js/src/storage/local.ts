/**
 * Local filesystem storage provider
 *
 * Fetches content from the local filesystem for current project references.
 */

import fs from 'fs/promises'
import path from 'path'
import type { ResolvedReference } from '../references/index.js'
import {
  type StorageProvider,
  type FetchResult,
  type FetchOptions,
  detectContentType,
  mergeFetchOptions,
} from './provider.js'

/**
 * Options for creating a LocalStorage provider
 */
export interface LocalStorageOptions {
  /** Base directory for resolving paths (default: process.cwd()) */
  baseDir?: string
}

/**
 * Local filesystem storage provider
 *
 * Handles fetching content from the local filesystem for references
 * that point to the current project.
 */
export class LocalStorage implements StorageProvider {
  readonly name = 'local'
  readonly type = 'local' as const

  private baseDir: string

  constructor(options: LocalStorageOptions = {}) {
    this.baseDir = options.baseDir || process.cwd()
  }

  /**
   * Check if this provider can handle the reference
   *
   * Local provider handles references that are in the current project
   * and have a local path.
   */
  canHandle(reference: ResolvedReference): boolean {
    return reference.isCurrentProject && !!reference.localPath
  }

  /**
   * Fetch content from local filesystem
   */
  async fetch(reference: ResolvedReference, options?: FetchOptions): Promise<FetchResult> {
    const opts = mergeFetchOptions(options)

    if (!reference.localPath) {
      throw new Error(`No local path for reference: ${reference.uri}`)
    }

    const fullPath = path.isAbsolute(reference.localPath)
      ? reference.localPath
      : path.join(this.baseDir, reference.localPath)

    // Check file exists
    try {
      await fs.access(fullPath)
    } catch {
      throw new Error(`File not found: ${fullPath}`)
    }

    // Check file size
    const stats = await fs.stat(fullPath)
    if (stats.size > opts.maxSize) {
      throw new Error(
        `File too large: ${stats.size} bytes (max: ${opts.maxSize} bytes)`
      )
    }

    // Read file content
    const content = await fs.readFile(fullPath)

    return {
      content,
      contentType: detectContentType(reference.localPath),
      size: content.length,
      source: 'local',
      metadata: {
        path: fullPath,
        mtime: stats.mtime.toISOString(),
      },
    }
  }

  /**
   * Check if file exists locally
   */
  async exists(reference: ResolvedReference): Promise<boolean> {
    if (!reference.localPath) {
      return false
    }

    const fullPath = path.isAbsolute(reference.localPath)
      ? reference.localPath
      : path.join(this.baseDir, reference.localPath)

    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Read file content as string
   */
  async readText(filePath: string): Promise<string> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath)

    return fs.readFile(fullPath, 'utf-8')
  }

  /**
   * Write content to file
   */
  async write(filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath)

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    await fs.writeFile(fullPath, content)
  }

  /**
   * Delete a file
   */
  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath)

    try {
      await fs.unlink(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * List files in a directory
   */
  async list(dirPath: string): Promise<string[]> {
    const fullPath = path.isAbsolute(dirPath)
      ? dirPath
      : path.join(this.baseDir, dirPath)

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => path.join(dirPath, e.name))
    } catch {
      return []
    }
  }
}

/**
 * Create a LocalStorage provider
 */
export function createLocalStorage(options?: LocalStorageOptions): LocalStorage {
  return new LocalStorage(options)
}
