/**
 * Types show command (v3.0)
 *
 * Shows details for a specific artifact type using SDK's TypeRegistry
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../../client/get-client';

/**
 * Format TTL from seconds to human-readable string
 */
function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function typesShowCommand(): Command {
  const cmd = new Command('show');

  cmd
    .description('Show details for a specific type')
    .argument('<name>', 'Type name')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options) => {
      try {
        // Get CodexClient instance
        const client = await getClient();
        const registry = client.getTypeRegistry();

        // Get type from registry
        const type = registry.get(name);

        if (!type) {
          console.error(chalk.red('Error:'), `Type "${name}" not found.`);
          console.log(chalk.dim('Run "fractary codex types list" to see available types.'));
          process.exit(1);
        }

        const isBuiltin = registry.isBuiltIn(name);

        if (options.json) {
          console.log(JSON.stringify({
            name: type.name,
            builtin: isBuiltin,
            description: type.description,
            patterns: type.patterns,
            defaultTtl: type.defaultTtl,
            ttl: formatTtl(type.defaultTtl),
            archiveAfterDays: type.archiveAfterDays,
            archiveStorage: type.archiveStorage,
            syncPatterns: type.syncPatterns,
            excludePatterns: type.excludePatterns
          }, null, 2));
          return;
        }

        // Display formatted output
        const nameColor = isBuiltin ? chalk.cyan : chalk.green;
        console.log(chalk.bold(`Type: ${nameColor(name)}\n`));

        console.log(`  ${chalk.dim('Source:')}      ${isBuiltin ? 'Built-in' : 'Custom'}`);
        console.log(`  ${chalk.dim('Description:')} ${type.description}`);
        console.log(`  ${chalk.dim('TTL:')}         ${formatTtl(type.defaultTtl)} (${type.defaultTtl} seconds)`);
        console.log('');

        console.log(chalk.bold('Patterns'));
        for (const pattern of type.patterns) {
          console.log(`  ${chalk.dim('•')} ${pattern}`);
        }

        if (type.archiveAfterDays !== null) {
          console.log('');
          console.log(chalk.bold('Archive Settings'));
          console.log(`  ${chalk.dim('After:')}   ${type.archiveAfterDays} days`);
          console.log(`  ${chalk.dim('Storage:')} ${type.archiveStorage || 'not set'}`);
        }

        if (type.syncPatterns && type.syncPatterns.length > 0) {
          console.log('');
          console.log(chalk.bold('Sync Patterns'));
          for (const pattern of type.syncPatterns) {
            console.log(`  ${chalk.dim('•')} ${pattern}`);
          }
        }

        if (type.excludePatterns && type.excludePatterns.length > 0) {
          console.log('');
          console.log(chalk.bold('Exclude Patterns'));
          for (const pattern of type.excludePatterns) {
            console.log(`  ${chalk.dim('•')} ${pattern}`);
          }
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
