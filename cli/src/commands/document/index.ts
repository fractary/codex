/**
 * Document command group (v3.0)
 *
 * Manages document operations with subcommands:
 * - fetch: Retrieve documents by URI
 */

import { Command } from 'commander';
import { fetchCommand } from './fetch.js';

export function documentCommand(): Command {
  const cmd = new Command('document');

  cmd
    .description('Manage document operations');

  // Register subcommands
  cmd.addCommand(fetchCommand());

  return cmd;
}
