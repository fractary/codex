/**
 * Sync command group (v3.0)
 *
 * Bidirectional synchronization with codex repository:
 * - project: Sync single project
 * - org: Sync all projects in organization
 */

import { Command } from 'commander';
import { syncProjectCommand } from './project';
import { syncOrgCommand } from './org';

export function syncCommand(): Command {
  const cmd = new Command('sync');

  cmd
    .description('Synchronize with codex repository');

  // Register subcommands
  cmd.addCommand(syncProjectCommand());
  cmd.addCommand(syncOrgCommand());

  return cmd;
}
