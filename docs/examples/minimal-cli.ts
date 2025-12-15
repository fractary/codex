/**
 * Minimal CLI Example
 *
 * Demonstrates a basic CLI with fetch and cache commands.
 */

import { Command } from 'commander'
import {
  CacheManager,
  StorageManager,
  parseReference,
  resolveReference,
  InvalidUriError,
  StorageError,
  CacheError
} from '@fractary/codex'

// Create reusable client
let cacheInstance: CacheManager | null = null

async function getCache(): Promise<CacheManager> {
  if (!cacheInstance) {
    const storage = StorageManager.create({
      providers: [
        { type: 'local', basePath: './knowledge' },
        { type: 'github', token: process.env.GITHUB_TOKEN }
      ]
    })

    cacheInstance = CacheManager.create({
      cacheDir: '.codex-cache',
      defaultTtl: 3600
    })
    cacheInstance.setStorageManager(storage)
  }
  return cacheInstance
}

// Format bytes helper
function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

// Main program
const program = new Command()

program
  .name('codex')
  .description('Fractary Codex CLI')
  .version('1.0.0')

// Fetch command
program
  .command('fetch <uri>')
  .description('Fetch a document from codex')
  .option('-o, --output <path>', 'Write to file instead of stdout')
  .option('--no-cache', 'Bypass cache')
  .option('-m, --metadata', 'Show metadata only')
  .action(async (uri: string, options) => {
    try {
      // Validate URI
      const ref = parseReference(uri)
      const resolved = resolveReference(ref.uri)

      const cache = await getCache()
      const result = await cache.get(resolved)

      if (options.metadata) {
        console.log(JSON.stringify({
          uri: ref.uri,
          org: ref.org,
          project: ref.project,
          path: ref.path,
          source: result.source,
          size: result.size,
          contentType: result.contentType,
          fromCache: result.metadata?.fromCache || false
        }, null, 2))
      } else if (options.output) {
        const fs = await import('fs/promises')
        await fs.writeFile(options.output, result.content)
        console.log(`✓ Saved to ${options.output}`)
      } else {
        console.log(result.content.toString())
      }
    } catch (error) {
      if (error instanceof InvalidUriError) {
        console.error(`Error: Invalid URI - ${error.message}`)
        console.error('Expected format: codex://org/project/path')
      } else if (error instanceof StorageError) {
        console.error(`Error: Storage operation failed - ${error.message}`)
      } else if (error instanceof CacheError) {
        console.error(`Error: Cache operation failed - ${error.message}`)
      } else {
        console.error(`Error: ${error instanceof Error ? error.message : error}`)
      }
      process.exit(1)
    }
  })

// Cache clear command
program
  .command('cache:clear')
  .description('Clear cache entries')
  .option('-p, --pattern <pattern>', 'Clear entries matching pattern')
  .option('-a, --all', 'Clear all entries')
  .action(async (options) => {
    try {
      const cache = await getCache()

      if (options.all) {
        await cache.invalidate()
        console.log('✓ All cache entries cleared')
      } else if (options.pattern) {
        await cache.invalidate(options.pattern)
        console.log(`✓ Cleared entries matching: ${options.pattern}`)
      } else {
        console.log('Please specify --all or --pattern')
        process.exit(1)
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

// Cache stats command
program
  .command('cache:stats')
  .description('Show cache statistics')
  .action(async () => {
    try {
      const cache = await getCache()
      const stats = await cache.getStats()

      console.log('Cache Statistics:')
      console.log(`  Total entries:  ${stats.totalEntries}`)
      console.log(`  Total size:     ${formatBytes(stats.totalSize)}`)
      console.log(`  Hit rate:       ${(stats.hitRate * 100).toFixed(2)}%`)
      console.log(`  Memory entries: ${stats.memoryEntries} (${formatBytes(stats.memorySize)})`)
      console.log(`  Disk entries:   ${stats.diskEntries} (${formatBytes(stats.diskSize)})`)
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

// Parse arguments
program.parse()
