/**
 * Initialize Codex project command
 *
 * Creates .fractary/config.yaml (unified config) with:
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
import { ensureCachePathIgnored } from '../../config/gitignore-utils';

/**
 * Validate organization or repository name format
 * Prevents command injection by ensuring only safe characters
 *
 * Valid: alphanumeric, hyphens, underscores, dots
 * Invalid: shell metacharacters, spaces, etc.
 */
export function validateNameFormat(name: string, type: 'organization' | 'repository'): void {
  if (!name || typeof name !== 'string') {
    throw new Error(`${type} name is required`);
  }

  if (name.length > 100) {
    throw new Error(`${type} name too long (max 100 characters)`);
  }

  // Only allow safe characters: alphanumeric, hyphens, underscores, dots
  // Must start with alphanumeric
  const safePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  if (!safePattern.test(name)) {
    throw new Error(
      `Invalid ${type} name format: "${name}". ` +
      `Must start with alphanumeric and contain only: a-z, A-Z, 0-9, ., -, _`
    );
  }
}

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
 * Result type for codex repository discovery
 */
export interface DiscoverCodexRepoResult {
  repo: string | null;
  error?: 'gh_not_installed' | 'auth_failed' | 'org_not_found' | 'no_repos_found' | 'unknown';
  message?: string;
}

/**
 * Discover codex repository in organization
 * Looks for repos matching codex.* pattern
 *
 * @param org - Organization name (must be validated before calling)
 * @returns Discovery result with repo name or error details
 */
export async function discoverCodexRepo(org: string): Promise<DiscoverCodexRepoResult> {
  // Validate org to prevent command injection
  try {
    validateNameFormat(org, 'organization');
  } catch (error: any) {
    return { repo: null, error: 'unknown', message: error.message };
  }

  try {
    const { execSync } = require('child_process');

    // First check if gh CLI is available
    try {
      execSync('gh --version', { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      return {
        repo: null,
        error: 'gh_not_installed',
        message: 'GitHub CLI (gh) is not installed. Install from https://cli.github.com/'
      };
    }

    // Check if authenticated
    try {
      execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
    } catch {
      return {
        repo: null,
        error: 'auth_failed',
        message: 'GitHub CLI not authenticated. Run: gh auth login'
      };
    }

    // Use gh CLI to list repos matching codex.* pattern
    // Note: org is validated above to contain only safe characters
    const result = execSync(
      `gh repo list ${org} --json name --jq '.[].name | select(startswith("codex."))' 2>&1`,
      { encoding: 'utf-8' }
    ).trim();

    // Check for org not found error
    if (result.includes('Could not resolve to an Organization') || result.includes('Not Found')) {
      return {
        repo: null,
        error: 'org_not_found',
        message: `Organization '${org}' not found on GitHub`
      };
    }

    const repos = result.split('\n').filter(Boolean);
    if (repos.length === 0) {
      return {
        repo: null,
        error: 'no_repos_found',
        message: `No codex.* repositories found in organization '${org}'`
      };
    }

    return { repo: repos[0] };
  } catch (error: any) {
    return {
      repo: null,
      error: 'unknown',
      message: error.message || 'Unknown error during discovery'
    };
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

/**
 * MCP server configuration result
 */
export interface McpInstallResult {
  installed: boolean;
  migrated: boolean;
  alreadyInstalled: boolean;
  backupPath?: string;
}

/**
 * Install or update MCP server configuration in .mcp.json
 *
 * This is the centralized logic for MCP configuration. Plugins should
 * call the CLI instead of implementing their own MCP installation logic.
 *
 * @param projectRoot - Project root directory
 * @param configPath - Path to config file (relative to project root)
 * @param options - Installation options
 */
export async function installMcpServer(
  projectRoot: string,
  configPath: string = '.fractary/config.yaml',
  options: { backup?: boolean } = {}
): Promise<McpInstallResult> {
  const mcpJsonPath = path.join(projectRoot, '.mcp.json');
  const { backup = true } = options;

  let existingConfig: any = { mcpServers: {} };
  let backupPath: string | undefined;
  let migrated = false;

  // Read existing .mcp.json if it exists
  if (await fileExists(mcpJsonPath)) {
    try {
      const content = await fs.readFile(mcpJsonPath, 'utf-8');
      existingConfig = JSON.parse(content);

      // Create backup if requested
      if (backup) {
        // Include milliseconds and random suffix to prevent collisions
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 18);
        const suffix = Math.random().toString(36).substring(2, 6);
        backupPath = `${mcpJsonPath}.backup.${timestamp}-${suffix}`;
        await fs.writeFile(backupPath, content);
      }
    } catch {
      // Invalid JSON - warn user and start fresh
      console.log(chalk.yellow('⚠ Warning: .mcp.json contains invalid JSON, starting fresh'));
      existingConfig = { mcpServers: {} };
    }
  }

  // Ensure mcpServers object exists
  if (!existingConfig.mcpServers) {
    existingConfig.mcpServers = {};
  }

  // Check if already installed with correct configuration
  const existing = existingConfig.mcpServers['fractary-codex'];
  if (existing) {
    const existingCommand = existing.command;
    const existingArgs = existing.args || [];

    // Check if it's the correct current format
    if (existingCommand === 'npx' && existingArgs.includes('@fractary/codex-mcp')) {
      return {
        installed: false,
        migrated: false,
        alreadyInstalled: true,
        backupPath
      };
    }

    // Old format detected - will migrate
    if (existingCommand === 'node' || existingArgs.includes('@fractary/codex')) {
      migrated = true;
    }
  }

  // Install the correct MCP server configuration
  existingConfig.mcpServers['fractary-codex'] = {
    command: 'npx',
    args: ['-y', '@fractary/codex-mcp', '--config', configPath]
  };

  // Write updated .mcp.json
  await fs.writeFile(
    mcpJsonPath,
    JSON.stringify(existingConfig, null, 2) + '\n'
  );

  return {
    installed: true,
    migrated,
    alreadyInstalled: false,
    backupPath
  };
}

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Initialize unified Fractary configuration (.fractary/config.yaml)')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--project <name>', 'Project name (default: derived from directory)')
    .option('--codex-repo <name>', 'Codex repository name (e.g., "codex.fractary.com")')
    .option('--force', 'Overwrite existing configuration')
    .option('--no-mcp', 'Skip MCP server installation')
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

        // Validate organization name format (security: prevents command injection)
        try {
          validateNameFormat(org, 'organization');
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          process.exit(1);
        }

        // Resolve project name
        let project = options.project;
        if (!project) {
          // Use current directory name
          project = path.basename(process.cwd());
          console.log(chalk.dim(`Project: ${chalk.cyan(project)}\n`));
        }

        // Resolve codex repository
        let codexRepo = options.codexRepo;

        // Validate codex repo if provided via CLI
        if (codexRepo) {
          try {
            validateNameFormat(codexRepo, 'repository');
          } catch (error: any) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
          }
          console.log(chalk.dim(`Codex repository: ${chalk.cyan(codexRepo)}\n`));
        } else {
          // Try to discover codex repo in the organization
          const discoveryResult = await discoverCodexRepo(org);
          if (discoveryResult.repo) {
            codexRepo = discoveryResult.repo;
            console.log(chalk.dim(`Codex repository: ${chalk.cyan(codexRepo)} (auto-discovered)\n`));
          } else {
            // Log specific error for debugging
            if (discoveryResult.error === 'gh_not_installed') {
              console.log(chalk.dim(`  Note: ${discoveryResult.message}\n`));
            } else if (discoveryResult.error === 'auth_failed') {
              console.log(chalk.dim(`  Note: ${discoveryResult.message}\n`));
            } else if (discoveryResult.error === 'org_not_found') {
              console.log(chalk.dim(`  Note: ${discoveryResult.message}\n`));
            }
          }
        }

        if (!codexRepo) {
          console.log(chalk.yellow(`⚠ Could not discover codex repository in organization '${org}'`));
          console.log(chalk.dim('  Use --codex-repo <name> to specify explicitly'));
          console.log(chalk.dim('  Expected naming convention: codex.{org}.{tld} (e.g., codex.fractary.com)\n'));
          // Use a placeholder that makes it clear it needs to be configured
          codexRepo = `codex.${org}.com`;
          console.log(chalk.dim(`  Using default: ${chalk.cyan(codexRepo)}\n`));
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

        // Ensure .fractary/.gitignore exists with cache path
        const gitignoreResult = await ensureCachePathIgnored(process.cwd(), '.fractary/codex/cache');

        if (gitignoreResult.created) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (created)'));
        } else if (gitignoreResult.updated) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (updated)'));
        } else {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (exists)'));
        }

        // Initialize or merge configuration
        console.log('\nInitializing configuration...');

        const result = await initializeUnifiedConfig(
          configPath,
          org,
          project,
          codexRepo,
          { force: options.force }
        );

        if (result.created) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (created)'));
        } else if (result.merged) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (merged with existing)'));
        }

        // Install MCP server configuration (unless --no-mcp)
        if (options.mcp !== false) {
          console.log('\nConfiguring MCP server...');
          const mcpResult = await installMcpServer(process.cwd(), '.fractary/config.yaml');

          if (mcpResult.alreadyInstalled) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (already configured)'));
          } else if (mcpResult.migrated) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (migrated from old format)'));
            if (mcpResult.backupPath) {
              console.log(chalk.dim(`  Backup: ${path.basename(mcpResult.backupPath)}`));
            }
          } else if (mcpResult.installed) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (created)'));
          }
        }

        // Success message
        console.log(chalk.green('\n✓ Unified configuration initialized successfully!\n'));

        console.log(chalk.bold('Configuration:'));
        console.log(chalk.dim(`  Organization: ${org}`));
        console.log(chalk.dim(`  Project: ${project}`));
        console.log(chalk.dim(`  Codex Repository: ${codexRepo}`));
        console.log(chalk.dim(`  Config: .fractary/config.yaml`));

        console.log(chalk.bold('\nFile plugin sources:'));
        console.log(chalk.dim('  - specs: .fractary/specs/ → S3'));
        console.log(chalk.dim('  - logs: .fractary/logs/ → S3'));

        console.log(chalk.bold('\nCodex plugin:'));
        console.log(chalk.dim('  - Cache: .fractary/codex/cache/'));
        console.log(chalk.dim('  - MCP Server: @fractary/codex-mcp (via npx)'));
        console.log(chalk.dim('  - Remotes: codex repo configured'));

        console.log(chalk.bold('\nGit Authentication:'));
        console.log(chalk.dim('  Codex sync uses your existing git credentials.'));
        console.log(chalk.dim('  Ensure you have access to the codex repository:'));
        console.log(chalk.dim(`    gh repo view ${org}/${codexRepo}`));
        console.log(chalk.dim('  Or set GITHUB_TOKEN environment variable.'));

        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.dim('  1. Restart Claude Code to load the MCP server'));
        console.log(chalk.dim('  2. Verify codex repository access: gh repo view ' + org + '/' + codexRepo));
        console.log(chalk.dim('  3. Configure AWS credentials for S3 access (if using file plugin)'));
        console.log(chalk.dim('  4. Edit .fractary/config.yaml to add external project remotes'));
        console.log(chalk.dim('  5. Reference docs via codex:// URIs (auto-fetched by MCP)'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
