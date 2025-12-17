/**
 * Fractary Codex CLI - Command-line interface for knowledge management
 *
 * Pull-based document retrieval with codex:// URI scheme and intelligent caching.
 *
 * @see https://github.com/fractary/codex
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { fetchCommand } from './commands/fetch.js';
import { cacheCommand } from './commands/cache/index.js';
import { syncCommand } from './commands/sync/index.js';
import { typesCommand } from './commands/types/index.js';
import { healthCommand } from './commands/health.js';
import { migrateCommand } from './commands/migrate.js';

/**
 * Create and configure the CLI
 */
function createCLI(): Command {
  const program = new Command('fractary-codex');

  program
    .description('Centralized knowledge management and distribution for AI agents')
    .version('0.2.0');

  // Core commands (v3.0)
  program.addCommand(initCommand());      // Initialize codex configuration
  program.addCommand(fetchCommand());     // Fetch documents by codex:// URI
  program.addCommand(cacheCommand());     // Cache management (list, clear, stats)
  program.addCommand(syncCommand());      // Bidirectional sync (project, org)
  program.addCommand(typesCommand());     // Type registry (list, show, add, remove)
  program.addCommand(healthCommand());    // Diagnostics and auto-repair
  program.addCommand(migrateCommand());   // v2.0 to v3.0 migration

  return program;
}

/**
 * Main execution
 */
async function main() {
  try {
    const program = createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the CLI
main();
