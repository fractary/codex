/**
 * Types remove command (v3.0)
 *
 * Unregisters a custom artifact type from YAML configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { readYamlConfig, writeYamlConfig } from '../../config/migrate-config';
import { getClient } from '../../client/get-client';

export function typesRemoveCommand(): Command {
  const cmd = new Command('remove');

  cmd
    .description('Remove a custom artifact type')
    .argument('<name>', 'Type name to remove')
    .option('--json', 'Output as JSON')
    .option('--force', 'Skip confirmation')
    .action(async (name: string, options) => {
      try {
        // Get registry to check type status
        const client = await getClient();
        const registry = client.getTypeRegistry();

        // Check for built-in type
        if (registry.isBuiltIn(name)) {
          console.error(chalk.red('Error:'), `Cannot remove built-in type "${name}".`);
          console.log(chalk.dim('Built-in types are permanent and cannot be removed.'));
          process.exit(1);
        }

        // Check if custom type exists
        if (!registry.has(name)) {
          console.error(chalk.red('Error:'), `Custom type "${name}" not found.`);
          console.log(chalk.dim('Run "fractary codex types list --custom-only" to see custom types.'));
          process.exit(1);
        }

        // Get type info before removal
        const typeInfo = registry.get(name)!;

        // Load YAML configuration
        const configPath = path.join(process.cwd(), '.fractary', 'codex.yaml');
        const config = await readYamlConfig(configPath);

        // Check if custom type exists in config
        if (!config.types?.custom?.[name]) {
          console.error(chalk.red('Error:'), `Custom type "${name}" not found in configuration.`);
          process.exit(1);
        }

        // Remove the type from config
        delete config.types.custom[name];

        // Clean up empty objects
        if (Object.keys(config.types.custom).length === 0) {
          delete config.types.custom;
        }
        if (config.types && Object.keys(config.types).length === 0) {
          delete config.types;
        }

        // Save config
        await writeYamlConfig(config, configPath);

        if (options.json) {
          console.log(JSON.stringify({
            success: true,
            removed: {
              name: typeInfo.name,
              description: typeInfo.description,
              patterns: typeInfo.patterns,
              defaultTtl: typeInfo.defaultTtl
            },
            message: 'Custom type removed successfully. Changes will take effect on next CLI invocation.'
          }, null, 2));
          return;
        }

        console.log(chalk.green('✓'), `Removed custom type "${chalk.cyan(name)}"`);
        console.log('');
        console.log(chalk.dim('Removed configuration:'));
        console.log(`  ${chalk.dim('Pattern:')}     ${typeInfo.patterns.join(', ')}`);
        console.log(`  ${chalk.dim('Description:')} ${typeInfo.description}`);
        console.log('');
        console.log(chalk.dim('Note: Custom type will be removed on next CLI invocation.'));

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
