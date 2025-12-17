/**
 * Cache command group (v3.0)
 *
 * Manages the codex document cache with subcommands:
 * - list: View cached entries
 * - clear: Remove cache entries
 * - stats: Display cache statistics
 */

import { Command } from 'commander';
import { cacheListCommand } from './list';
import { cacheClearCommand } from './clear';
import { cacheStatsCommand } from './stats';

export function cacheCommand(): Command {
  const cmd = new Command('cache');

  cmd
    .description('Manage the codex document cache');

  // Register subcommands
  cmd.addCommand(cacheListCommand());
  cmd.addCommand(cacheClearCommand());
  cmd.addCommand(cacheStatsCommand());

  return cmd;
}
