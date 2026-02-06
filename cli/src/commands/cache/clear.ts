/**
 * Cache clear command (v3.0)
 *
 * Clears cache entries using SDK's CacheManager
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { formatBytes } from '@fractary/codex';
import { getClient } from '../../client/get-client';

export function cacheClearCommand(): Command {
  const cmd = new Command('cache-clear');

  cmd
    .description('Clear cache entries')
    .option('--all', 'Clear entire cache')
    .option('--pattern <glob>', 'Clear entries matching URI pattern (e.g., "codex://fractary/*")')
    .option('--dry-run', 'Show what would be cleared without actually clearing')
    .action(async (options) => {
      try {
        // Get CodexClient instance
        const client = await getClient();

        // Get stats before clearing (for reporting)
        const statsBefore = await client.getCacheStats();

        if (statsBefore.entryCount === 0) {
          console.log(chalk.yellow('Cache is already empty. Nothing to clear.'));
          return;
        }

        // Determine what to clear
        let pattern: string | undefined;

        if (options.all) {
          pattern = undefined; // Clear all
        } else if (options.pattern) {
          pattern = options.pattern;
        } else {
          console.log(chalk.yellow('Please specify what to clear:'));
          console.log(chalk.dim('  --all        Clear entire cache'));
          console.log(chalk.dim('  --pattern    Clear entries matching pattern (e.g., "codex://fractary/*")'));
          console.log('');
          console.log(chalk.dim('Examples:'));
          console.log(chalk.dim('  fractary-codex cache-clear --all'));
          console.log(chalk.dim('  fractary-codex cache-clear --pattern "codex://fractary/cli/*"'));
          return;
        }

        if (options.dryRun) {
          console.log(chalk.blue('Dry run - would clear:\n'));
          if (pattern) {
            console.log(chalk.dim(`  Pattern: ${pattern}`));
            console.log(chalk.dim(`  This would invalidate matching cache entries`));
          } else {
            console.log(chalk.dim(`  All cache entries (${statsBefore.entryCount} entries)`));
          }
          console.log(chalk.dim(`\nTotal size: ${formatBytes(statsBefore.totalSize)}`));
          return;
        }

        // Perform invalidation
        if (pattern) {
          console.log(chalk.blue(`Clearing cache entries matching pattern: ${pattern}\n`));
          await client.invalidateCache(pattern);
        } else {
          console.log(chalk.blue(`Clearing entire cache (${statsBefore.entryCount} entries)...\n`));
          await client.invalidateCache();
        }

        // Get stats after clearing
        const statsAfter = await client.getCacheStats();
        const entriesCleared = statsBefore.entryCount - statsAfter.entryCount;
        const sizeFreed = statsBefore.totalSize - statsAfter.totalSize;

        // Summary
        console.log(chalk.green(`✓ Cleared ${entriesCleared} entries (${formatBytes(sizeFreed)} freed)`));

        if (statsAfter.entryCount > 0) {
          console.log(chalk.dim(`  Remaining: ${statsAfter.entryCount} entries (${formatBytes(statsAfter.totalSize)})`));
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
