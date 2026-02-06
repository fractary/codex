/**
 * Cache list command (v3.0)
 *
 * Lists cache entries using SDK's CacheManager.listEntries()
 * Now provides detailed information about each cached entry.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { formatBytes, type ListEntriesOptions } from '@fractary/codex'
import { getClient } from '../../client/get-client'

/**
 * Format remaining TTL for display
 */
function formatTtl(seconds: number): string {
  if (seconds < 0) {
    const expired = -seconds
    if (expired < 60) return chalk.red(`expired ${expired}s ago`)
    if (expired < 3600) return chalk.red(`expired ${Math.floor(expired / 60)}m ago`)
    return chalk.red(`expired ${Math.floor(expired / 3600)}h ago`)
  }
  if (seconds < 60) return chalk.green(`${seconds}s`)
  if (seconds < 3600) return chalk.green(`${Math.floor(seconds / 60)}m`)
  if (seconds < 86400) return chalk.yellow(`${Math.floor(seconds / 3600)}h`)
  return chalk.dim(`${Math.floor(seconds / 86400)}d`)
}

/**
 * Format status with color
 */
function formatStatus(status: 'fresh' | 'stale' | 'expired'): string {
  switch (status) {
    case 'fresh':
      return chalk.green('fresh')
    case 'stale':
      return chalk.yellow('stale')
    case 'expired':
      return chalk.red('expired')
  }
}

export function cacheListCommand(): Command {
  const cmd = new Command('cache-list')

  cmd
    .description('List cache entries')
    .option('--json', 'Output as JSON')
    .option('--status <status>', 'Filter by status (fresh, stale, expired, all)', 'all')
    .option('--limit <n>', 'Maximum number of entries to show', parseInt)
    .option('--sort <field>', 'Sort by field (uri, size, createdAt, expiresAt)', 'uri')
    .option('--desc', 'Sort in descending order')
    .option('--verbose', 'Show detailed entry information')
    .action(async (options) => {
      try {
        // Get CodexClient instance
        const client = await getClient()

        // Build list options
        const listOptions: ListEntriesOptions = {
          status: options.status as 'fresh' | 'stale' | 'expired' | 'all',
          limit: options.limit,
          sortBy: options.sort as 'uri' | 'size' | 'createdAt' | 'expiresAt',
          sortDirection: options.desc ? 'desc' : 'asc',
        }

        // Get entries from SDK
        const result = await client.listCacheEntries(listOptions)

        if (result.total === 0) {
          if (options.json) {
            console.log(JSON.stringify({ entries: [], total: 0, message: 'Cache is empty' }))
          } else {
            console.log(chalk.yellow('Cache is empty.'))
            console.log(chalk.dim('Fetch some documents to populate the cache.'))
          }
          return
        }

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
          return
        }

        // Display header
        console.log(chalk.bold(`Cache Entries (${result.entries.length} of ${result.total})\n`))

        // Display entries
        if (options.verbose) {
          // Detailed view
          for (const entry of result.entries) {
            console.log(chalk.cyan(entry.uri))
            console.log(`  Status:       ${formatStatus(entry.status)}`)
            console.log(`  Size:         ${formatBytes(entry.size)}`)
            console.log(`  Content-Type: ${chalk.dim(entry.contentType)}`)
            console.log(`  TTL:          ${formatTtl(entry.remainingTtl)}`)
            console.log(`  In Memory:    ${entry.inMemory ? chalk.green('yes') : chalk.dim('no')}`)
            console.log('')
          }
        } else {
          // Compact view - table format
          const maxUriLen = Math.min(
            60,
            Math.max(...result.entries.map((e) => e.uri.length))
          )

          console.log(
            chalk.dim(
              `${'URI'.padEnd(maxUriLen)}  ${'STATUS'.padEnd(8)}  ${'SIZE'.padEnd(10)}  TTL`
            )
          )
          console.log(chalk.dim('─'.repeat(maxUriLen + 35)))

          for (const entry of result.entries) {
            const uri =
              entry.uri.length > maxUriLen
                ? '...' + entry.uri.slice(-(maxUriLen - 3))
                : entry.uri.padEnd(maxUriLen)

            console.log(
              `${chalk.cyan(uri)}  ${formatStatus(entry.status).padEnd(17)}  ${formatBytes(entry.size).padEnd(10)}  ${formatTtl(entry.remainingTtl)}`
            )
          }
        }

        // Show pagination info
        if (result.hasMore) {
          console.log('')
          console.log(
            chalk.dim(
              `Showing ${result.entries.length} of ${result.total} entries. Use --limit to see more.`
            )
          )
        }

        // Show stats summary
        const stats = await client.getCacheStats()
        console.log('')
        console.log(chalk.dim('─'.repeat(60)))
        console.log(
          chalk.dim(
            `Total: ${stats.entryCount} entries (${formatBytes(stats.totalSize)}) | ` +
              `${stats.freshCount} fresh, ${stats.staleCount} stale, ${stats.expiredCount} expired`
          )
        )
      } catch (error: any) {
        // Provide specific error messages based on error type
        const errorMessage = error.message || 'Unknown error'

        if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
          console.error(chalk.red('Error:'), 'Cache directory not accessible')
          console.error(chalk.dim('Run "fractary-codex configure" to initialize the cache.'))
        } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
          console.error(chalk.red('Error:'), 'Permission denied accessing cache directory')
          console.error(chalk.dim('Check file permissions for .fractary/codex/cache/'))
        } else if (errorMessage.includes('ENOSPC')) {
          console.error(chalk.red('Error:'), 'No space left on device')
          console.error(chalk.dim('Free up disk space and try again.'))
        } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
          console.error(chalk.red('Error:'), 'Failed to parse cache metadata')
          console.error(chalk.dim('The cache may be corrupted. Try "fractary-codex cache-clear".'))
        } else {
          console.error(chalk.red('Error:'), errorMessage)
        }

        process.exit(1)
      }
    })

  return cmd
}
