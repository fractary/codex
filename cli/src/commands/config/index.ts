/**
 * Config command group
 *
 * Manages configuration operations with subcommands:
 * - init: Initialize unified configuration (.fractary/config.yaml)
 */

import { Command } from 'commander';
import { initCommand } from './init.js';

export function configCommand(): Command {
  const cmd = new Command('config');

  cmd
    .description('Manage configuration');

  // Register subcommands
  cmd.addCommand(initCommand());

  return cmd;
}
