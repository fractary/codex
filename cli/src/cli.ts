/**
 * Fractary Codex CLI - Command-line interface for knowledge management
 *
 * Pull-based document retrieval with codex:// URI scheme and intelligent caching.
 *
 * @see https://github.com/fractary/codex
 */

import { Command } from 'commander';
import { documentCommand } from './commands/document/index.js';
import { configCommand } from './commands/config/index.js';
import { cacheCommand } from './commands/cache/index.js';
import { syncCommand } from './commands/sync.js';
import { typesCommand } from './commands/types/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

/**
 * Create and configure the CLI
 */
function createCLI(): Command {
  const program = new Command('fractary-codex');

  program
    .description('Centralized knowledge management and distribution for AI agents')
    .version(VERSION);

  // Core commands (v3.0 - noun-verb pattern)
  program.addCommand(documentCommand());  // Document operations (fetch)
  program.addCommand(configCommand());    // Configuration operations (init, migrate)
  program.addCommand(cacheCommand());     // Cache management (list, clear, stats, health)
  program.addCommand(syncCommand());      // Bidirectional sync
  program.addCommand(typesCommand());     // Type registry (list, show, add, remove)

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
