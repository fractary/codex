/**
 * Sync org command (v3.0)
 *
 * Synchronizes all projects in an organization with the codex repository using SDK SyncManager:
 * - Discovers repositories via GitHub CLI
 * - Parallel sync execution
 * - Pattern-based filtering and exclusion
 * - Dry-run mode
 * - Per-repo error handling
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { execSync } from 'child_process';
// Import types only
import type {
  SyncDirection,
  SyncOptions
} from '@fractary/codex';
import { readYamlConfig } from '../../config/migrate-config';

interface RepoInfo {
  name: string;
  url: string;
  defaultBranch: string;
}

interface OrgSyncResult {
  repo: string;
  status: 'success' | 'skipped' | 'error';
  filesSynced?: number;
  duration?: number;
  error?: string;
}

/**
 * Get environment branch mapping
 */
function getEnvironmentBranch(config: any, env: string): string {
  const envMap = config.sync?.environments || {
    dev: 'develop',
    test: 'test',
    staging: 'staging',
    prod: 'main'
  };

  return envMap[env] || env;
}

/**
 * Discover repositories in organization using GitHub CLI
 */
async function discoverRepos(org: string): Promise<RepoInfo[]> {
  try {
    const output = execSync(
      `gh repo list ${org} --json name,url,defaultBranchRef --limit 100`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const repos = JSON.parse(output);
    return repos.map((repo: any) => ({
      name: repo.name,
      url: repo.url,
      defaultBranch: repo.defaultBranchRef?.name || 'main'
    }));
  } catch (error: any) {
    throw new Error(`Failed to discover repos: ${error.message}. Ensure GitHub CLI is installed and authenticated.`);
  }
}

/**
 * Check if repo should be excluded
 */
function shouldExclude(repoName: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple glob matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(repoName)) {
      return true;
    }
  }
  return false;
}

/**
 * Sync a single repository
 */
async function syncRepository(
  repo: RepoInfo,
  config: any,
  direction: SyncDirection,
  syncOptions: SyncOptions
): Promise<OrgSyncResult> {
  const startTime = Date.now();

  try {
    // Dynamic import to avoid loading SDK at module time
    const { createSyncManager, createLocalStorage } = await import('@fractary/codex');

    // Note: In a real implementation, this would:
    // 1. Clone or update local copy of repo to a temp directory
    // 2. Create SyncManager for that directory
    // 3. Execute sync plan
    // 4. Commit and push changes if direction includes 'to-codex'

    // For now, we'll demonstrate the SDK integration pattern
    // Assuming repo is already cloned to a local directory
    const repoDir = path.join(process.cwd(), '..', repo.name);

    // Create LocalStorage for this repo
    const localStorage = createLocalStorage({
      baseDir: repoDir
    });

    // Create SyncManager
    const syncManager = createSyncManager({
      localStorage,
      config: config.sync,
      manifestPath: path.join(repoDir, '.fractary', '.codex-sync-manifest.json')
    });

    // Get include patterns from config
    const includePatterns = config.sync?.include || [
      'docs/**/*.md',
      'specs/**/*.md',
      '.fractary/standards/**',
      '.fractary/templates/**'
    ];

    // List files in repo
    const allFiles = await syncManager.listLocalFiles(repoDir);

    // Filter by include patterns
    const targetFiles = allFiles.filter(file => {
      for (const pattern of includePatterns) {
        const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
        if (regex.test(file.path)) {
          return true;
        }
      }
      return false;
    });

    // Create and execute sync plan
    const plan = await syncManager.createPlan(
      config.organization,
      repo.name,
      repoDir,
      targetFiles,
      syncOptions
    );

    if (plan.totalFiles === 0) {
      return {
        repo: repo.name,
        status: 'skipped',
        filesSynced: 0,
        duration: Date.now() - startTime
      };
    }

    const result = await syncManager.executePlan(plan, syncOptions);

    return {
      repo: repo.name,
      status: result.success ? 'success' : 'error',
      filesSynced: result.synced,
      duration: Date.now() - startTime,
      error: result.success ? undefined : `${result.failed} files failed`
    };

  } catch (error: any) {
    return {
      repo: repo.name,
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

export function syncOrgCommand(): Command {
  const cmd = new Command('org');

  cmd
    .description('Sync all projects in organization with codex repository')
    .option('--env <env>', 'Target environment (dev/test/staging/prod)', 'prod')
    .option('--dry-run', 'Show what would sync without executing')
    .option('--exclude <pattern>', 'Exclude repos matching pattern (can be used multiple times)', (val, prev: string[]) => prev.concat([val]), [])
    .option('--parallel <n>', 'Number of parallel syncs', parseInt, 3)
    .option('--direction <dir>', 'Sync direction (to-codex/from-codex/bidirectional)', 'bidirectional')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Load YAML config
        const configPath = path.join(process.cwd(), '.fractary', 'codex.yaml');
        let config;

        try {
          config = await readYamlConfig(configPath);
        } catch (error) {
          console.error(chalk.red('Error:'), 'Codex not initialized.');
          console.log(chalk.dim('Run "fractary codex init" first.'));
          process.exit(1);
        }

        // Validate direction
        const validDirections: SyncDirection[] = ['to-codex', 'from-codex', 'bidirectional'];
        if (!validDirections.includes(options.direction as SyncDirection)) {
          console.error(chalk.red('Error:'), `Invalid direction: ${options.direction}`);
          console.log(chalk.dim('Valid options: to-codex, from-codex, bidirectional'));
          process.exit(1);
        }

        const direction = options.direction as SyncDirection;
        const org = config.organization;
        const targetBranch = getEnvironmentBranch(config, options.env);

        // Combine config excludes with CLI excludes
        const excludePatterns = [
          ...(config.sync?.exclude || []),
          ...options.exclude
        ];

        if (!options.json) {
          console.log(chalk.bold('Organization Sync\n'));
          console.log(`  Organization: ${chalk.cyan(org)}`);
          console.log(`  Environment:  ${chalk.cyan(options.env)} (${targetBranch})`);
          console.log(`  Direction:    ${chalk.cyan(direction)}`);
          console.log(`  Parallelism:  ${chalk.cyan(options.parallel.toString())}`);
          if (excludePatterns.length > 0) {
            console.log(`  Excluding:    ${chalk.dim(excludePatterns.join(', '))}`);
          }
          console.log('');
          console.log(chalk.dim('Discovering repositories...'));
        }

        // Discover repos
        let repos: RepoInfo[];
        try {
          repos = await discoverRepos(org);
        } catch (error: any) {
          if (options.json) {
            console.log(JSON.stringify({ error: error.message }));
          } else {
            console.error(chalk.red('Error:'), error.message);
          }
          process.exit(1);
        }

        // Filter excluded repos
        const eligibleRepos = repos.filter(repo => !shouldExclude(repo.name, excludePatterns));
        const excludedRepos = repos.filter(repo => shouldExclude(repo.name, excludePatterns));

        if (!options.json) {
          console.log(chalk.dim(`Found ${repos.length} repositories (${excludedRepos.length} excluded)\n`));
        }

        if (options.dryRun) {
          if (options.json) {
            console.log(JSON.stringify({
              organization: org,
              environment: options.env,
              branch: targetBranch,
              direction,
              dryRun: true,
              repos: {
                total: repos.length,
                eligible: eligibleRepos.map(r => r.name),
                excluded: excludedRepos.map(r => r.name)
              }
            }, null, 2));
          } else {
            console.log(chalk.blue('Dry run - would sync:\n'));

            for (const repo of eligibleRepos) {
              console.log(chalk.green('  ✓'), repo.name);
            }

            if (excludedRepos.length > 0) {
              console.log('');
              console.log(chalk.dim('Excluded:'));
              for (const repo of excludedRepos) {
                console.log(chalk.dim(`  - ${repo.name}`));
              }
            }

            console.log(chalk.dim(`\nTotal: ${eligibleRepos.length} repos would be synced`));
            console.log(chalk.dim('Run without --dry-run to execute sync.'));
          }
          return;
        }

        // Execute sync
        if (!options.json) {
          console.log(chalk.blue('Syncing repositories...\n'));
        }

        const results: OrgSyncResult[] = [];
        const syncOptions: SyncOptions = {
          direction,
          dryRun: false,
          force: false
        };

        // Process in parallel batches
        for (let i = 0; i < eligibleRepos.length; i += options.parallel) {
          const batch = eligibleRepos.slice(i, i + options.parallel);
          const batchResults = await Promise.all(
            batch.map(repo => syncRepository(repo, config, direction, syncOptions))
          );

          for (const result of batchResults) {
            results.push(result);

            if (!options.json) {
              if (result.status === 'success') {
                console.log(
                  chalk.green('  ✓'),
                  result.repo,
                  chalk.dim(`(${result.filesSynced} files in ${result.duration}ms)`)
                );
              } else if (result.status === 'skipped') {
                console.log(
                  chalk.dim('  -'),
                  result.repo,
                  chalk.dim('(no files to sync)')
                );
              } else if (result.status === 'error') {
                console.log(
                  chalk.red('  ✗'),
                  result.repo,
                  chalk.red(`(${result.error})`)
                );
              }
            }
          }
        }

        // Summary
        const successful = results.filter(r => r.status === 'success');
        const skipped = results.filter(r => r.status === 'skipped');
        const failed = results.filter(r => r.status === 'error');
        const totalFiles = successful.reduce((sum, r) => sum + (r.filesSynced || 0), 0);

        if (options.json) {
          console.log(JSON.stringify({
            organization: org,
            environment: options.env,
            branch: targetBranch,
            direction,
            results: {
              total: results.length,
              successful: successful.length,
              skipped: skipped.length,
              failed: failed.length,
              filesSynced: totalFiles,
              details: results
            }
          }, null, 2));
        } else {
          console.log('');
          console.log(chalk.green(`✓ Synced ${successful.length}/${results.length} repos (${totalFiles} files)`));
          if (skipped.length > 0) {
            console.log(chalk.dim(`  Skipped ${skipped.length} repos (no changes)`));
          }
          if (failed.length > 0) {
            console.log(chalk.red(`✗ ${failed.length} repos failed`));
          }
        }

      } catch (error: any) {
        if (options.json) {
          console.log(JSON.stringify({ error: error.message }));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
        process.exit(1);
      }
    });

  return cmd;
}
