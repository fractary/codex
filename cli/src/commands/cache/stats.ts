/**
 * Cache stats command (v3.0)
 *
 * Display cache statistics using SDK's CacheManager
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

export function cacheStatsCommand(): Command {
  const cmd = new Command('cache-stats');

  cmd
    .description('Display cache statistics')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Get CodexClient instance
        const client = await getClient();

        // Get cache stats from SDK
        const stats = await client.getCacheStats();

        if (options.json) {
          console.log(JSON.stringify(stats, null, 2));
          return;
        }

        // Display formatted output
        console.log(chalk.bold('Cache Statistics\n'));

        console.log(chalk.bold('Overview'));
        console.log(`  Total entries:     ${chalk.cyan(stats.entryCount.toString())}`);
        console.log(`  Total size:        ${chalk.cyan(formatSize(stats.totalSize))}`);
        console.log(`  Fresh entries:     ${chalk.green(stats.freshCount.toString())}`);
        console.log(`  Stale entries:     ${stats.staleCount > 0 ? chalk.yellow(stats.staleCount.toString()) : chalk.dim('0')}`);
        console.log(`  Expired entries:   ${stats.expiredCount > 0 ? chalk.red(stats.expiredCount.toString()) : chalk.dim('0')}`);
        console.log('');

        // Health indicator based on fresh vs total ratio
        const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100;
        const healthColor = healthPercent > 80 ? chalk.green : healthPercent > 50 ? chalk.yellow : chalk.red;
        console.log(`Cache health: ${healthColor(`${healthPercent.toFixed(0)}% fresh`)}`);

        if (stats.expiredCount > 0) {
          console.log(chalk.dim('\nRun "fractary-codex cache-clear --pattern <pattern>" to clean up entries.'));
        }

        if (stats.entryCount === 0) {
          console.log(chalk.dim('\nNo cached entries. Fetch some documents to populate the cache.'));
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
