/**
 * Initialize Codex project command (v3.0 YAML)
 *
 * Creates .fractary/codex/config.yaml configuration with:
 * - Organization detection from git remote
 * - Multi-provider storage configuration
 * - Cache configuration
 * - Type registry setup
 * - Optional MCP server registration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { initializeUnifiedConfig } from '../../config/unified-config';

/**
 * Extract org from git remote URL
 */
async function getOrgFromGitRemote(): Promise<string | null> {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' }).trim();

    // Parse GitHub URL: git@github.com:org/repo.git or https://github.com/org/repo.git
    const sshMatch = remote.match(/git@github\.com:([^/]+)\//);
    const httpsMatch = remote.match(/github\.com\/([^/]+)\//);

    return sshMatch?.[1] || httpsMatch?.[1] || null;
  } catch {
    return null;
  }
}

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

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Initialize unified Fractary configuration (.fractary/config.yaml)')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--project <name>', 'Project name (default: derived from directory)')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Initializing unified Fractary configuration...\n'));

        // Resolve organization
        let org = options.org;

        if (!org) {
          // Try git remote first
          org = await getOrgFromGitRemote();
        }

        if (!org) {
          // Try SDK's resolveOrganization (dynamic import)
          try {
            const { resolveOrganization } = await import('@fractary/codex');
            org = resolveOrganization({
              repoName: path.basename(process.cwd())
            });
          } catch {
            // SDK method failed, continue
          }
        }

        if (!org) {
          // Default fallback
          org = path.basename(process.cwd()).split('-')[0] || 'default';
          console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`));
          console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'));
        } else {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`));
        }

        // Resolve project name
        let project = options.project;
        if (!project) {
          // Use current directory name
          project = path.basename(process.cwd());
          console.log(chalk.dim(`Project: ${chalk.cyan(project)}\n`));
        }

        // Unified config path
        const configPath = path.join(process.cwd(), '.fractary', 'config.yaml');
        const configExists = await fileExists(configPath);

        if (configExists && !options.force) {
          console.log(chalk.yellow(`⚠ Configuration already exists at .fractary/config.yaml`));
          console.log(chalk.dim('Merging with existing configuration...\n'));
        }

        // Create directory structure
        console.log('Creating directory structure...');

        const dirs = [
          '.fractary',
          '.fractary/specs',
          '.fractary/logs',
          '.fractary/codex',
          '.fractary/codex/cache'
        ];

        for (const dir of dirs) {
          await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
          console.log(chalk.green('✓'), chalk.dim(dir + '/'));
        }

        // Initialize or merge configuration
        console.log('\nInitializing configuration...');

        const result = await initializeUnifiedConfig(
          configPath,
          org,
          project,
          { force: options.force }
        );

        if (result.created) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (created)'));
        } else if (result.merged) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (merged with existing)'));
        }

        // Success message
        console.log(chalk.green('\n✓ Unified configuration initialized successfully!\n'));

        console.log(chalk.bold('Configuration:'));
        console.log(chalk.dim(`  Organization: ${org}`));
        console.log(chalk.dim(`  Project: ${project}`));
        console.log(chalk.dim(`  Config: .fractary/config.yaml`));

        console.log(chalk.bold('\nFile plugin sources:'));
        console.log(chalk.dim('  - specs: .fractary/specs/ → S3'));
        console.log(chalk.dim('  - logs: .fractary/logs/ → S3'));

        console.log(chalk.bold('\nCodex plugin:'));
        console.log(chalk.dim('  - Cache: .fractary/codex/cache/'));
        console.log(chalk.dim('  - Dependencies: (none configured)'));

        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.dim('  1. Configure AWS credentials for S3 access'));
        console.log(chalk.dim('  2. Edit .fractary/config.yaml to add external project dependencies'));
        console.log(chalk.dim('  3. Access current project files: codex://specs/SPEC-001.md'));
        console.log(chalk.dim('  4. Access external projects: codex://org/project/docs/README.md'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
