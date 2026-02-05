/**
 * Fractary Codex CLI - Command-line interface for knowledge management
 *
 * Pull-based document retrieval with codex:// URI scheme and intelligent caching.
 *
 * @see https://github.com/fractary/codex
 */

import { Command } from 'commander';
import { configureCommand } from './commands/config/index.js';
import { documentFetchCommand } from './commands/document/index.js';
import { cacheListCommand, cacheClearCommand, cacheStatsCommand, cacheHealthCommand } from './commands/cache/index.js';
import { syncCommand } from './commands/sync.js';
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

  // Top-level commands (hyphenated naming to match plugin conventions)
  program.addCommand(configureCommand());      // Initialize configuration
  program.addCommand(documentFetchCommand());  // Fetch documents by URI
  program.addCommand(cacheListCommand());      // List cache entries
  program.addCommand(cacheClearCommand());     // Clear cache entries
  program.addCommand(cacheStatsCommand());     // Display cache statistics
  program.addCommand(cacheHealthCommand());    // Run diagnostics
  program.addCommand(syncCommand());           // Bidirectional sync

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
