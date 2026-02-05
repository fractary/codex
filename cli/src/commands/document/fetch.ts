/**
 * Document fetch command (v3.0)
 *
 * Retrieves documents by codex:// URI reference using SDK's CodexClient:
 * - Cache-first retrieval for fast access
 * - TTL-based cache invalidation
 * - Multiple storage provider support
 * - Automatic URI validation and resolution
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { getClient } from '../../client/get-client';

/**
 * Calculate content hash
 */
function hashContent(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function documentFetchCommand(): Command {
  const cmd = new Command('document-fetch');

  cmd
    .description('Fetch a document by codex:// URI reference')
    .argument('<uri>', 'Codex URI (e.g., codex://org/project/docs/file.md)')
    .option('--bypass-cache', 'Skip cache and fetch directly from source')
    .option('--ttl <seconds>', 'Override default TTL (in seconds)', parseInt)
    .option('--json', 'Output as JSON with metadata')
    .option('--output <file>', 'Write content to file instead of stdout')
    .action(async (uri: string, options) => {
      try {
        // Dynamically import validateUri to avoid loading SDK at module time
        const { validateUri } = await import('@fractary/codex');

        // Validate URI format
        if (!validateUri(uri)) {
          console.error(chalk.red('Error: Invalid URI format'));
          console.log(chalk.dim('Expected: codex://org/project/path/to/file.md'));
          console.log(chalk.dim('Example: codex://fractary/codex/docs/api.md'));
          process.exit(1);
        }

        // Get CodexClient instance
        const client = await getClient();

        // Show fetching message (unless JSON output)
        if (!options.json && !options.bypassCache) {
          console.error(chalk.dim(`Fetching ${uri}...`));
        }

        // Fetch using CodexClient
        const result = await client.fetch(uri, {
          bypassCache: options.bypassCache,
          ttl: options.ttl
        });

        // Output handling
        if (options.json) {
          const output = {
            uri,
            content: result.content.toString('utf-8'),
            metadata: {
              fromCache: result.fromCache,
              fetchedAt: result.metadata?.fetchedAt,
              expiresAt: result.metadata?.expiresAt,
              contentLength: result.metadata?.contentLength || result.content.length,
              contentHash: hashContent(result.content)
            }
          };
          console.log(JSON.stringify(output, null, 2));
        } else if (options.output) {
          // Write to file
          await fs.writeFile(options.output, result.content);
          console.log(chalk.green('✓'), `Written to ${options.output}`);
          console.log(chalk.dim(`  Size: ${result.content.length} bytes`));
          if (result.fromCache) {
            console.log(chalk.dim('  Source: cache'));
          } else {
            console.log(chalk.dim('  Source: storage'));
          }
        } else {
          // Print to stdout
          if (result.fromCache && !options.bypassCache) {
            console.error(chalk.green('✓'), chalk.dim('from cache\n'));
          } else {
            console.error(chalk.green('✓'), chalk.dim('fetched\n'));
          }
          console.log(result.content.toString('utf-8'));
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);

        // Provide helpful error messages
        if (error.message.includes('Failed to load configuration')) {
          console.log(chalk.dim('\nRun "fractary-codex configure" to create a configuration.'));
        } else if (error.message.includes('GITHUB_TOKEN')) {
          console.log(chalk.dim('\nSet your GitHub token: export GITHUB_TOKEN="your_token"'));
        } else if (error.message.includes('not found') || error.message.includes('404')) {
          console.log(chalk.dim('\nThe document may not exist or you may not have access.'));
          console.log(chalk.dim('Check the URI and ensure your storage providers are configured correctly.'));
        }

        process.exit(1);
      }
    });

  return cmd;
}
