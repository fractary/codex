/**
 * Config command group (v3.0)
 *
 * Manages configuration operations with subcommands:
 * - init: Initialize configuration
 * - migrate: Migrate configuration from v2.0 to v3.0
 */

import { Command } from 'commander';
import { initCommand } from './init.js';
import { migrateCommand } from './migrate.js';

export function configCommand(): Command {
  const cmd = new Command('config');

  cmd
    .description('Manage configuration');

  // Register subcommands
  cmd.addCommand(initCommand());
  cmd.addCommand(migrateCommand());

  return cmd;
}
