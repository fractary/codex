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
import { getDefaultYamlConfig, writeYamlConfig } from '../../config/migrate-config';

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
    .description('Initialize Codex v3.0 with YAML configuration')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--mcp', 'Enable MCP server registration')
    .option('--force', 'Overwrite existing configuration')
    .action(async (options) => {
      try {
        console.log(chalk.blue('Initializing Codex v3.0 (YAML format)...\n'));

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

        // Config path (v4.0 standard)
        const configDir = path.join(process.cwd(), '.fractary', 'codex');
        const configPath = path.join(configDir, 'config.yaml');
        const configExists = await fileExists(configPath);

        if (configExists && !options.force) {
          console.log(chalk.yellow('⚠ Configuration already exists at .fractary/codex/config.yaml'));
          console.log(chalk.dim('Use --force to overwrite'));
          process.exit(1);
        }

        // Create directory structure
        console.log('Creating directory structure...');

        const dirs = [
          '.fractary/codex',
          '.fractary/codex/cache'
        ];

        for (const dir of dirs) {
          await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
          console.log(chalk.green('✓'), chalk.dim(dir + '/'));
        }

        // Create configuration
        console.log('\nCreating YAML configuration...');

        const config = getDefaultYamlConfig(org);

        // Enable MCP if requested
        if (options.mcp && config.mcp) {
          config.mcp.enabled = true;
        }

        // Write YAML config
        await writeYamlConfig(config, configPath);
        console.log(chalk.green('✓'), chalk.dim('.fractary/codex/config.yaml'));

        // Success message
        console.log(chalk.green('\n✓ Codex v4.0 initialized successfully!\n'));

        console.log(chalk.bold('Configuration:'));
        console.log(chalk.dim(`  Organization: ${org}`));
        console.log(chalk.dim(`  Cache: .fractary/codex/cache/`));
        console.log(chalk.dim(`  Config: .fractary/codex/config.yaml`));
        if (options.mcp) {
          console.log(chalk.dim(`  MCP Server: Enabled (port 3000)`));
        }

        console.log(chalk.bold('\nStorage providers configured:'));
        console.log(chalk.dim('  - Local filesystem (./knowledge)'));
        console.log(chalk.dim('  - GitHub (requires GITHUB_TOKEN)'));
        console.log(chalk.dim('  - HTTP endpoint'));

        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.dim('  1. Set your GitHub token: export GITHUB_TOKEN="your_token"'));
        console.log(chalk.dim('  2. Edit .fractary/codex/config.yaml to configure storage providers'));
        console.log(chalk.dim('  3. Fetch a document: fractary codex fetch codex://org/project/path'));
        console.log(chalk.dim('  4. Check cache: fractary codex cache list'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
