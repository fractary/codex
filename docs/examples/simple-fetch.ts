/**
 * Simple Fetch Example
 *
 * Demonstrates basic document fetching with caching.
 */

import {
  CacheManager,
  StorageManager,
  parseReference,
  resolveReference
} from '@fractary/codex'

async function main() {
  // Create storage manager with multiple providers
  const storage = StorageManager.create({
    providers: [
      { type: 'local', basePath: './knowledge' },
      { type: 'github', token: process.env.GITHUB_TOKEN }
    ]
  })

  // Create cache manager
  const cache = CacheManager.create({
    cacheDir: '.codex-cache',
    maxMemorySize: 50 * 1024 * 1024, // 50 MB
    defaultTtl: 3600 // 1 hour
  })
  cache.setStorageManager(storage)

  // Fetch a document
  const uri = 'codex://fractary/codex/docs/README.md'

  console.log(`Fetching: ${uri}`)

  try {
    // Parse and resolve reference
    const ref = parseReference(uri)
    console.log(`Organization: ${ref.org}`)
    console.log(`Project: ${ref.project}`)
    console.log(`Path: ${ref.path}`)

    const resolved = resolveReference(uri, { cacheDir: '.codex-cache' })
    console.log(`Cache path: ${resolved.cachePath}`)
    console.log(`Is local: ${resolved.isLocal}`)

    // First fetch (from storage)
    console.log('\nFirst fetch...')
    const result1 = await cache.get(resolved)
    console.log(`Source: ${result1.source}`)
    console.log(`Size: ${result1.size} bytes`)
    console.log(`From cache: ${result1.metadata?.fromCache || false}`)
    console.log(`Content preview: ${result1.content.toString().substring(0, 100)}...`)

    // Second fetch (from cache)
    console.log('\nSecond fetch...')
    const result2 = await cache.get(resolved)
    console.log(`From cache: ${result2.metadata?.fromCache || false}`)

    // Get cache statistics
    const stats = await cache.getStats()
    console.log('\nCache Statistics:')
    console.log(`Total entries: ${stats.totalEntries}`)
    console.log(`Memory entries: ${stats.memoryEntries}`)
    console.log(`Disk entries: ${stats.diskEntries}`)
    console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)

  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

main()
