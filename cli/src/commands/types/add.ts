/**
 * Types add command (v3.0)
 *
 * Registers a custom artifact type in YAML configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { readYamlConfig, writeYamlConfig } from '../../config/migrate-config';
import { getClient } from '../../client/get-client';

/**
 * Validate type name
 */
function isValidTypeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

/**
 * Parse TTL string to seconds
 */
function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid TTL format');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: throw new Error('Unknown TTL unit');
  }
}

/**
 * Format TTL from seconds to human-readable string
 */
function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function typesAddCommand(): Command {
  const cmd = new Command('add');

  cmd
    .description('Add a custom artifact type')
    .argument('<name>', 'Type name (lowercase, alphanumeric with hyphens)')
    .requiredOption('--pattern <glob>', 'File pattern (glob syntax)')
    .option('--ttl <duration>', 'Cache TTL (e.g., "24h", "7d")', '24h')
    .option('--description <text>', 'Type description')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options) => {
      try {
        // Validate type name
        if (!isValidTypeName(name)) {
          console.error(chalk.red('Error:'), 'Invalid type name.');
          console.log(chalk.dim('Type name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.'));
          process.exit(1);
        }

        // Get registry to check for conflicts
        const client = await getClient();
        const registry = client.getTypeRegistry();

        // Check for built-in type conflict
        if (registry.isBuiltIn(name)) {
          console.error(chalk.red('Error:'), `Cannot override built-in type "${name}".`);
          const builtinNames = registry.list().filter(t => registry.isBuiltIn(t.name)).map(t => t.name);
          console.log(chalk.dim('Built-in types: ' + builtinNames.join(', ')));
          process.exit(1);
        }

        // Check if type already exists
        if (registry.has(name)) {
          console.error(chalk.red('Error:'), `Custom type "${name}" already exists.`);
          console.log(chalk.dim('Use "fractary codex types remove" first to remove it.'));
          process.exit(1);
        }

        // Parse and validate TTL
        let ttlSeconds: number;
        try {
          ttlSeconds = parseTtl(options.ttl);
        } catch {
          console.error(chalk.red('Error:'), 'Invalid TTL format.');
          console.log(chalk.dim('Expected format: <number><unit> where unit is s (seconds), m (minutes), h (hours), or d (days)'));
          console.log(chalk.dim('Examples: 30m, 24h, 7d'));
          process.exit(1);
        }

        // Load YAML configuration
        const configPath = path.join(process.cwd(), '.fractary', 'codex', 'config.yaml');
        const config = await readYamlConfig(configPath);

        // Initialize types.custom if needed
        if (!config.types) {
          config.types = { custom: {} };
        }
        if (!config.types.custom) {
          config.types.custom = {};
        }

        // Add the new type to config
        config.types.custom[name] = {
          description: options.description || `Custom type: ${name}`,
          patterns: [options.pattern],
          defaultTtl: ttlSeconds
        };

        // Save config
        await writeYamlConfig(config, configPath);

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            type: {
              name,
              description: config.types.custom[name].description,
              patterns: config.types.custom[name].patterns,
              defaultTtl: ttlSeconds,
              ttl: formatTtl(ttlSeconds),
              builtin: false
            },
            message: 'Custom type added successfully. Changes will take effect on next CLI invocation.'
          }, null, 2));
          return;
        }

        console.log(chalk.green('✓'), `Added custom type "${chalk.cyan(name)}"`);
        console.log('');
        console.log(`  ${chalk.dim('Pattern:')}     ${options.pattern}`);
        console.log(`  ${chalk.dim('TTL:')}         ${formatTtl(ttlSeconds)} (${ttlSeconds} seconds)`);
        if (options.description) {
          console.log(`  ${chalk.dim('Description:')} ${options.description}`);
        }
        console.log('');
        console.log(chalk.dim('Note: Custom type will be available on next CLI invocation.'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        if (error.message.includes('Failed to load configuration')) {
          console.log(chalk.dim('\nRun "fractary codex init" to create a configuration.'));
        }
        process.exit(1);
      }
    });

  return cmd;
}
