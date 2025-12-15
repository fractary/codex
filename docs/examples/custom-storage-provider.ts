/**
 * Custom Storage Provider Example
 *
 * Demonstrates implementing a custom storage provider for the Codex SDK.
 * This example shows a Redis-based storage provider.
 */

import {
  StorageProvider,
  ResolvedReference,
  FetchResult,
  FetchOptions,
  StorageManager
} from '@fractary/codex'
import { createClient, RedisClientType } from 'redis'

/**
 * Redis Storage Provider
 *
 * Stores documents in Redis with automatic expiration.
 */
export class RedisStorage implements StorageProvider {
  readonly name = 'redis'
  readonly type = 'redis' as const

  private client: RedisClientType
  private connected = false
  private keyPrefix: string

  constructor(options: {
    url?: string
    keyPrefix?: string
  } = {}) {
    this.client = createClient({
      url: options.url || process.env.REDIS_URL || 'redis://localhost:6379'
    })
    this.keyPrefix = options.keyPrefix || 'codex:'

    // Handle connection events
    this.client.on('error', (err) => {
      console.error('Redis error:', err)
    })

    this.client.on('connect', () => {
      this.connected = true
      console.log('Redis connected')
    })

    this.client.on('disconnect', () => {
      this.connected = false
      console.log('Redis disconnected')
    })
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect()
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit()
    }
  }

  /**
   * Generate Redis key for reference
   */
  private getKey(reference: ResolvedReference): string {
    return `${this.keyPrefix}${reference.org}:${reference.project}:${reference.path}`
  }

  /**
   * Check if this provider can handle the reference
   */
  canHandle(reference: ResolvedReference): boolean {
    // This provider can handle all references if Redis is connected
    return this.connected
  }

  /**
   * Fetch document from Redis
   */
  async fetch(
    reference: ResolvedReference,
    options?: FetchOptions
  ): Promise<FetchResult> {
    await this.connect()

    const key = this.getKey(reference)

    // Get document from Redis
    const data = await this.client.get(key)

    if (!data) {
      throw new Error(`Document not found in Redis: ${reference.uri}`)
    }

    // Parse stored data (JSON format)
    const stored = JSON.parse(data)

    return {
      content: Buffer.from(stored.content, 'base64'),
      contentType: stored.contentType || 'text/plain',
      size: stored.size,
      source: this.name,
      metadata: {
        ...stored.metadata,
        storedAt: stored.storedAt,
        expiresAt: stored.expiresAt
      }
    }
  }

  /**
   * Store document in Redis
   */
  async store(
    reference: ResolvedReference,
    result: FetchResult,
    ttl?: number
  ): Promise<void> {
    await this.connect()

    const key = this.getKey(reference)

    // Prepare data for storage
    const stored = {
      content: result.content.toString('base64'),
      contentType: result.contentType,
      size: result.size,
      metadata: result.metadata,
      storedAt: new Date().toISOString(),
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null
    }

    // Store in Redis with optional TTL
    if (ttl) {
      await this.client.setEx(key, ttl, JSON.stringify(stored))
    } else {
      await this.client.set(key, JSON.stringify(stored))
    }
  }

  /**
   * Check if document exists in Redis
   */
  async exists(reference: ResolvedReference): Promise<boolean> {
    await this.connect()

    const key = this.getKey(reference)
    const exists = await this.client.exists(key)

    return exists === 1
  }

  /**
   * Delete document from Redis
   */
  async delete(reference: ResolvedReference): Promise<void> {
    await this.connect()

    const key = this.getKey(reference)
    await this.client.del(key)
  }

  /**
   * Clear all documents matching pattern
   */
  async clear(pattern?: string): Promise<number> {
    await this.connect()

    const searchPattern = pattern
      ? `${this.keyPrefix}${pattern}`
      : `${this.keyPrefix}*`

    // Get all matching keys
    const keys = await this.client.keys(searchPattern)

    if (keys.length === 0) {
      return 0
    }

    // Delete all matching keys
    await this.client.del(keys)
    return keys.length
  }
}

/**
 * Usage Example
 */
async function main() {
  // Create Redis storage provider
  const redis = new RedisStorage({
    url: 'redis://localhost:6379',
    keyPrefix: 'codex:'
  })

  // Create storage manager with Redis and fallbacks
  const storage = StorageManager.create()
  storage.registerProvider(redis, 50) // Medium priority

  // Also register other providers
  const { LocalStorage, GitHubStorage } = await import('@fractary/codex')
  storage.registerProvider(new LocalStorage({ basePath: './knowledge' }), 10)
  storage.registerProvider(new GitHubStorage(), 100)

  // Test fetch (will try Redis first, then fallback to other providers)
  try {
    const { resolveReference } = await import('@fractary/codex')
    const ref = resolveReference('codex://fractary/codex/README.md')

    console.log('Fetching document...')
    const result = await storage.fetch(ref)
    console.log(`✓ Fetched from: ${result.source}`)
    console.log(`  Size: ${result.size} bytes`)

    // Store in Redis for future fetches
    console.log('\nStoring in Redis...')
    await redis.store(ref, result, 3600) // 1 hour TTL
    console.log('✓ Stored in Redis')

    // Next fetch should come from Redis
    console.log('\nFetching again...')
    const cachedResult = await storage.fetch(ref)
    console.log(`✓ Fetched from: ${cachedResult.source}`)

    // Check if exists
    const exists = await redis.exists(ref)
    console.log(`\nExists in Redis: ${exists}`)

    // Clear Redis cache
    console.log('\nClearing Redis cache...')
    const cleared = await redis.clear()
    console.log(`✓ Cleared ${cleared} entries`)

  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
  } finally {
    // Clean up
    await redis.disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  })
}

export default RedisStorage
