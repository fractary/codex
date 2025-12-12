/**
 * Cache persistence layer
 *
 * Handles reading and writing cache entries to disk with
 * atomic writes and corruption detection.
 */

import fs from 'fs/promises'
import path from 'path'
import type { CacheEntry } from './entry.js'

/**
 * Options for cache persistence
 */
export interface CachePersistenceOptions {
  /** Base directory for cache storage */
  cacheDir: string
  /** File extension for cache files */
  extension?: string
  /** Whether to use atomic writes */
  atomicWrites?: boolean
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  entryCount: number
  /** Total size in bytes */
  totalSize: number
  /** Number of fresh entries */
  freshCount: number
  /** Number of stale entries */
  staleCount: number
  /** Number of expired entries */
  expiredCount: number
}

/**
 * Cache persistence layer
 *
 * Handles reading and writing cache entries to the filesystem.
 * Uses a directory structure: {cacheDir}/{org}/{project}/{path}.cache
 */
export class CachePersistence {
  private cacheDir: string
  private extension: string
  private atomicWrites: boolean

  constructor(options: CachePersistenceOptions) {
    this.cacheDir = options.cacheDir
    this.extension = options.extension || '.cache'
    this.atomicWrites = options.atomicWrites ?? true
  }

  /**
   * Get the cache file path for a URI
   */
  getCachePath(uri: string): string {
    // Parse the URI to extract org/project/path
    const match = uri.match(/^codex:\/\/([^/]+)\/([^/]+)(?:\/(.*))?$/)
    if (!match || !match[1] || !match[2]) {
      throw new Error(`Invalid codex URI: ${uri}`)
    }

    const [, org, project, filePath] = match
    const relativePath = filePath || 'index'

    return path.join(this.cacheDir, org, project, relativePath + this.extension)
  }

  /**
   * Get the metadata file path for a URI
   */
  getMetadataPath(uri: string): string {
    return this.getCachePath(uri).replace(this.extension, '.meta.json')
  }

  /**
   * Read a cache entry from disk
   */
  async read(uri: string): Promise<CacheEntry | null> {
    const cachePath = this.getCachePath(uri)
    const metadataPath = this.getMetadataPath(uri)

    try {
      // Read metadata and content in parallel
      const [metadataJson, content] = await Promise.all([
        fs.readFile(metadataPath, 'utf-8'),
        fs.readFile(cachePath),
      ])

      const metadata = JSON.parse(metadataJson)
      return {
        metadata,
        content,
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * Write a cache entry to disk
   */
  async write(entry: CacheEntry): Promise<void> {
    const cachePath = this.getCachePath(entry.metadata.uri)
    const metadataPath = this.getMetadataPath(entry.metadata.uri)

    // Ensure directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true })

    if (this.atomicWrites) {
      // Write to temp files first, then rename
      const tempCachePath = cachePath + '.tmp'
      const tempMetadataPath = metadataPath + '.tmp'

      try {
        await Promise.all([
          fs.writeFile(tempCachePath, entry.content),
          fs.writeFile(tempMetadataPath, JSON.stringify(entry.metadata, null, 2)),
        ])

        await Promise.all([
          fs.rename(tempCachePath, cachePath),
          fs.rename(tempMetadataPath, metadataPath),
        ])
      } catch (error) {
        // Clean up temp files on error
        await Promise.all([
          fs.unlink(tempCachePath).catch(() => {}),
          fs.unlink(tempMetadataPath).catch(() => {}),
        ])
        throw error
      }
    } else {
      await Promise.all([
        fs.writeFile(cachePath, entry.content),
        fs.writeFile(metadataPath, JSON.stringify(entry.metadata, null, 2)),
      ])
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(uri: string): Promise<boolean> {
    const cachePath = this.getCachePath(uri)
    const metadataPath = this.getMetadataPath(uri)

    try {
      await Promise.all([fs.unlink(cachePath), fs.unlink(metadataPath)])
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false
      }
      throw error
    }
  }

  /**
   * Check if a cache entry exists
   */
  async exists(uri: string): Promise<boolean> {
    const cachePath = this.getCachePath(uri)

    try {
      await fs.access(cachePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * List all cached URIs
   */
  async list(): Promise<string[]> {
    const uris: string[] = []

    try {
      const orgs = await fs.readdir(this.cacheDir)

      for (const org of orgs) {
        const orgPath = path.join(this.cacheDir, org)
        const orgStat = await fs.stat(orgPath)
        if (!orgStat.isDirectory()) continue

        const projects = await fs.readdir(orgPath)

        for (const project of projects) {
          const projectPath = path.join(orgPath, project)
          const projectStat = await fs.stat(projectPath)
          if (!projectStat.isDirectory()) continue

          // Recursively find all cache files
          const files = await this.listFilesRecursive(projectPath)

          for (const file of files) {
            if (file.endsWith(this.extension)) {
              // Convert path back to URI
              const relativePath = path.relative(projectPath, file)
              const filePath = relativePath.slice(0, -this.extension.length)
              uris.push(`codex://${org}/${project}/${filePath}`)
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }

    return uris
  }

  /**
   * Recursively list files in a directory
   */
  private async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await this.listFilesRecursive(fullPath)))
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<number> {
    let count = 0

    try {
      const orgs = await fs.readdir(this.cacheDir)

      for (const org of orgs) {
        const orgPath = path.join(this.cacheDir, org)
        const stat = await fs.stat(orgPath)
        if (stat.isDirectory()) {
          await fs.rm(orgPath, { recursive: true })
          count++
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }

    return count
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    const uris = await this.list()
    let cleared = 0

    for (const uri of uris) {
      const entry = await this.read(uri)
      if (entry && entry.metadata.expiresAt < Date.now()) {
        if (await this.delete(uri)) {
          cleared++
        }
      }
    }

    return cleared
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      entryCount: 0,
      totalSize: 0,
      freshCount: 0,
      staleCount: 0,
      expiredCount: 0,
    }

    const uris = await this.list()
    const now = Date.now()
    const staleWindow = 5 * 60 * 1000

    for (const uri of uris) {
      const entry = await this.read(uri)
      if (entry) {
        stats.entryCount++
        stats.totalSize += entry.metadata.size

        if (now < entry.metadata.expiresAt) {
          stats.freshCount++
        } else if (now < entry.metadata.expiresAt + staleWindow) {
          stats.staleCount++
        } else {
          stats.expiredCount++
        }
      }
    }

    return stats
  }

  /**
   * Ensure cache directory exists
   */
  async ensureDir(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true })
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir
  }
}

/**
 * Create a cache persistence layer
 */
export function createCachePersistence(options: CachePersistenceOptions): CachePersistence {
  return new CachePersistence(options)
}
