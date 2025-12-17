/**
 * Types command group (v3.0)
 *
 * Manages the artifact type registry:
 * - list: View all types (built-in and custom)
 * - show: View details for a specific type
 * - add: Register a custom type
 * - remove: Unregister a custom type
 */

import { Command } from 'commander';
import { typesListCommand } from './list';
import { typesShowCommand } from './show';
import { typesAddCommand } from './add';
import { typesRemoveCommand } from './remove';

export function typesCommand(): Command {
  const cmd = new Command('types');

  cmd
    .description('Manage artifact type registry');

  // Register subcommands
  cmd.addCommand(typesListCommand());
  cmd.addCommand(typesShowCommand());
  cmd.addCommand(typesAddCommand());
  cmd.addCommand(typesRemoveCommand());

  return cmd;
}
