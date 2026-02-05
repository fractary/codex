/**
 * Cache list command (v3.0)
 *
 * Lists cache information using SDK's CacheManager
 *
 * Note: The SDK's CacheManager doesn't expose individual cache entries.
 * Use 'cache-stats' for detailed cache statistics.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client';

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cacheListCommand(): Command {
  const cmd = new Command('cache-list');

  cmd
    .description('List cache information')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Get CodexClient instance
        const client = await getClient();

        // Get cache stats from SDK
        const stats = await client.getCacheStats();

        if (stats.entryCount === 0) {
          if (options.json) {
            console.log(JSON.stringify({ entries: 0, message: 'Cache is empty' }));
          } else {
            console.log(chalk.yellow('Cache is empty.'));
            console.log(chalk.dim('Fetch some documents to populate the cache.'));
          }
          return;
        }

        if (options.json) {
          console.log(JSON.stringify({
            entryCount: stats.entryCount,
            totalSize: stats.totalSize,
            freshCount: stats.freshCount,
            staleCount: stats.staleCount,
            expiredCount: stats.expiredCount
          }, null, 2));
          return;
        }

        // Display cache overview
        console.log(chalk.bold('Cache Overview\n'));

        console.log(chalk.bold('Entries:'));
        console.log(`  Total:    ${chalk.cyan(stats.entryCount.toString())} entries`);
        console.log(`  Fresh:    ${chalk.green(stats.freshCount.toString())} entries`);
        console.log(`  Stale:    ${stats.staleCount > 0 ? chalk.yellow(stats.staleCount.toString()) : chalk.dim('0')} entries`);
        console.log(`  Expired:  ${stats.expiredCount > 0 ? chalk.red(stats.expiredCount.toString()) : chalk.dim('0')} entries`);
        console.log('');

        console.log(chalk.bold('Storage:'));
        console.log(`  Total size: ${chalk.cyan(formatSize(stats.totalSize))}`);
        console.log('');

        // Health indicator
        const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100;
        const healthColor = healthPercent > 80 ? chalk.green : healthPercent > 50 ? chalk.yellow : chalk.red;
        console.log(`Cache health: ${healthColor(`${healthPercent.toFixed(0)}% fresh`)}`);
        console.log('');

        console.log(chalk.dim('Note: Individual cache entries are managed by the SDK.'));
        console.log(chalk.dim('Use "fractary-codex cache-stats" for detailed statistics.'));
        console.log(chalk.dim('Use "fractary-codex cache-clear" to clear cache entries.'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
