/**
 * Migrate command (v3.0)
 *
 * Migrates legacy v2.x JSON configurations to v3.0 YAML format:
 * - Detects legacy config at .fractary/plugins/codex/config.json
 * - Creates backup of old config
 * - Transforms to v3.0 YAML format
 * - Writes to .fractary/codex.yaml
 * - Validates migration result
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  migrateConfig,
  writeYamlConfig,
  type MigrationResult
} from '../../config/migrate-config';

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content
 */
async function readFileContent(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export function migrateCommand(): Command {
  const cmd = new Command('migrate');

  cmd
    .description('Migrate legacy JSON configuration to v3.0 YAML format')
    .option('--dry-run', 'Show migration plan without executing')
    .option('--no-backup', 'Skip creating backup of old config')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const legacyConfigPath = path.join(process.cwd(), '.fractary', 'plugins', 'codex', 'config.json');
        const newConfigPath = path.join(process.cwd(), '.fractary', 'codex.yaml');

        // Check if legacy config exists
        if (!await fileExists(legacyConfigPath)) {
          if (options.json) {
            console.log(JSON.stringify({
              status: 'no_config',
              message: 'No legacy configuration file found',
              path: legacyConfigPath
            }));
          } else {
            console.log(chalk.yellow('⚠ No legacy configuration file found.'));
            console.log(chalk.dim(`  Expected: ${legacyConfigPath}`));
            console.log(chalk.dim('\nRun "fractary codex init" to create a new v3.0 YAML configuration.'));
          }
          return;
        }

        // Check if new YAML config already exists
        if (await fileExists(newConfigPath) && !options.dryRun) {
          if (options.json) {
            console.log(JSON.stringify({
              status: 'already_migrated',
              message: 'YAML configuration already exists',
              path: newConfigPath
            }));
          } else {
            console.log(chalk.yellow('⚠ YAML configuration already exists.'));
            console.log(chalk.dim(`  Path: ${newConfigPath}`));
            console.log(chalk.dim('\nUse "fractary codex init --force" to recreate.'));
          }
          return;
        }

        // Load and validate legacy config
        const legacyContent = await readFileContent(legacyConfigPath);
        let legacyConfig: any;

        try {
          legacyConfig = JSON.parse(legacyContent);
        } catch {
          console.error(chalk.red('Error:'), 'Invalid JSON in legacy config file.');
          process.exit(1);
        }

        if (!options.json && !options.dryRun) {
          console.log(chalk.blue('Migrating Codex configuration to v3.0 YAML format...\n'));
        }

        // Perform migration using utility
        const migrationResult: MigrationResult = await migrateConfig(
          legacyConfigPath,
          {
            createBackup: options.backup !== false,
            backupSuffix: new Date().toISOString().replace(/[:.]/g, '-')
          }
        );

        // Display migration plan
        if (!options.json) {
          console.log(chalk.bold('Legacy Configuration:'));
          console.log(chalk.dim(`  Path: ${legacyConfigPath}`));
          console.log(chalk.dim(`  Organization: ${legacyConfig.organization || legacyConfig.organizationSlug || 'unknown'}`));
          console.log('');

          console.log(chalk.bold('Migration Changes:'));
          console.log(chalk.green('  + Format: JSON → YAML'));
          console.log(chalk.green('  + Location: .fractary/plugins/codex/ → .fractary/'));
          console.log(chalk.green('  + File: config.json → codex.yaml'));
          console.log(chalk.green('  + Storage: Multi-provider configuration'));
          console.log(chalk.green('  + Cache: Modern cache management'));
          console.log(chalk.green('  + Types: Custom type registry'));

          if (migrationResult.warnings.length > 0) {
            console.log('');
            console.log(chalk.yellow('Warnings:'));
            for (const warning of migrationResult.warnings) {
              console.log(chalk.yellow('  ⚠'), chalk.dim(warning));
            }
          }

          console.log('');

          if (options.dryRun) {
            console.log(chalk.blue('Dry run - no changes made.'));
            console.log(chalk.dim('Run without --dry-run to execute migration.'));
            return;
          }
        }

        // JSON output for dry run
        if (options.json) {
          const output: any = {
            status: options.dryRun ? 'migration_ready' : 'migrated',
            dryRun: options.dryRun || false,
            legacyConfig: {
              path: legacyConfigPath,
              organization: legacyConfig.organization || legacyConfig.organizationSlug
            },
            newConfig: {
              path: newConfigPath,
              organization: migrationResult.yamlConfig.organization
            },
            warnings: migrationResult.warnings,
            backupPath: migrationResult.backupPath
          };

          console.log(JSON.stringify(output, null, 2));

          if (options.dryRun) {
            return;
          }
        }

        // Write new YAML config
        if (!options.dryRun) {
          await writeYamlConfig(migrationResult.yamlConfig, newConfigPath);

          // Create cache directory
          const cacheDir = path.join(process.cwd(), '.codex-cache');
          await fs.mkdir(cacheDir, { recursive: true });

          if (!options.json) {
            console.log(chalk.green('✓'), 'YAML configuration created');
            console.log(chalk.green('✓'), 'Cache directory initialized');
            if (migrationResult.backupPath) {
              console.log(chalk.green('✓'), 'Legacy config backed up');
            }

            console.log('');
            console.log(chalk.bold('New Configuration:'));
            console.log(chalk.dim(`  Path: ${newConfigPath}`));
            console.log(chalk.dim(`  Organization: ${migrationResult.yamlConfig.organization}`));
            console.log(chalk.dim(`  Cache: ${migrationResult.yamlConfig.cacheDir || '.codex-cache'}`));
            console.log(chalk.dim(`  Storage Providers: ${migrationResult.yamlConfig.storage?.length || 0}`));

            console.log('');
            console.log(chalk.bold('Next Steps:'));
            console.log(chalk.dim('  1. Review the new configuration: .fractary/codex.yaml'));
            console.log(chalk.dim('  2. Set your GitHub token: export GITHUB_TOKEN="your_token"'));
            console.log(chalk.dim('  3. Test fetching: fractary codex fetch codex://org/project/path'));

            if (migrationResult.backupPath) {
              console.log('');
              console.log(chalk.dim(`Backup saved: ${path.basename(migrationResult.backupPath)}`));
            }
          }
        }

      } catch (error: any) {
        if (options.json) {
          console.log(JSON.stringify({
            status: 'error',
            message: error.message
          }));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
        process.exit(1);
      }
    });

  return cmd;
}
