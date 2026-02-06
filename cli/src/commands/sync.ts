/**
 * Sync command (v3.0)
 *
 * Synchronizes project with the codex repository using SDK SyncManager:
 * - Multi-directional sync (to-codex, from-codex, bidirectional)
 * - Manifest tracking for sync state
 * - Conflict detection and resolution
 * - Pattern-based file filtering
 * - Dry-run mode
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
// Import types only
import type {
  SyncDirection,
  SyncOptions,
  SyncConfig
} from '@fractary/codex';
import { formatBytes, formatDuration } from '@fractary/codex';
import { readYamlConfig } from '../config/migrate-config';

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

export function syncCommand(): Command {
  const cmd = new Command('sync');

  cmd
    .description('Sync single project with codex repository')
    .argument('[name]', 'Project name (auto-detected if not provided)')
    .option('--env <env>', 'Target environment (dev/test/staging/prod)', 'prod')
    .option('--dry-run', 'Show what would sync without executing')
    .option('--direction <dir>', 'Sync direction (to-codex/from-codex/bidirectional)', 'bidirectional')
    .option('--include <pattern>', 'Include files matching pattern (can be used multiple times)', (val, prev: string[]) => prev.concat([val]), [])
    .option('--exclude <pattern>', 'Exclude files matching pattern (can be used multiple times)', (val, prev: string[]) => prev.concat([val]), [])
    .option('--force', 'Force sync without checking timestamps')
    .option('--json', 'Output as JSON')
    .option('--work-id <id>', 'GitHub issue number or URL to scope sync to')
    .action(async (name: string | undefined, options) => {
      try {
        // Load YAML config (unified config path)
        const configPath = path.join(process.cwd(), '.fractary', 'config.yaml');
        let config;

        try {
          config = await readYamlConfig(configPath);
        } catch (error) {
          console.error(chalk.red('Error:'), 'Codex not initialized.');
          console.log(chalk.dim('Run "fractary-codex configure" first.'));
          process.exit(1);
        }

        // Dynamic import to avoid loading SDK at module time
        const { createSyncManager, createLocalStorage, detectCurrentProject } = await import('@fractary/codex');

        // Determine project name (priority: CLI arg > config > git detection)
        let projectName = name;
        if (!projectName) {
          // First try config file (readYamlConfig extracts the codex section)
          projectName = config.project || undefined;
        }
        if (!projectName) {
          // Fall back to git remote detection
          const detected = detectCurrentProject();
          projectName = detected.project || undefined;
        }

        if (!projectName) {
          console.error(chalk.red('Error:'), 'Could not determine project name.');
          console.log(chalk.dim('Provide project name as argument, set codex.project in config, or run from a git repository.'));
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
        const targetBranch = getEnvironmentBranch(config, options.env);

        // Create LocalStorage instance
        const localStorage = createLocalStorage({
          baseDir: process.cwd()
        });

        // Create SyncManager
        const syncManager = createSyncManager({
          localStorage,
          config: config.sync as Partial<SyncConfig>,
          manifestPath: path.join(process.cwd(), '.fractary', '.codex-sync-manifest.json')
        });

        // Get include patterns from config or use defaults
        // For to-codex: use config.sync.to_codex if available
        // For from-codex: config.sync.from_codex is handled by routing scanner
        const defaultToCodexPatterns = [
          'docs/**/*.md',
          'specs/**/*.md',
          '.fractary/standards/**',
          '.fractary/templates/**'
        ];

        // Use proper type for sync config
        const syncConfig = config.sync as Partial<SyncConfig> | undefined;

        // Use SDK to resolve patterns (handles both new and legacy formats)
        const sdkPatterns = syncManager.getToCodexPatterns();
        const configIncludePatterns = sdkPatterns.length > 0
          ? sdkPatterns
          : defaultToCodexPatterns;
        const configExcludePatterns = syncConfig?.to_codex?.exclude || syncConfig?.exclude || [];

        // CLI options override config
        const includePatterns = options.include.length > 0 ? options.include : configIncludePatterns;
        const excludePatterns = [
          ...configExcludePatterns,
          ...options.exclude
        ];

        // Scan local files using proper glob pattern matching
        const sourceDir = process.cwd();
        const { glob: globSync } = await import('glob');

        // Match files using glob patterns
        const matchedFilePaths = new Set<string>();

        for (const pattern of includePatterns) {
          try {
            const matches = await globSync(pattern, {
              cwd: sourceDir,
              dot: true,
              nodir: true,
              ignore: excludePatterns
            });
            matches.forEach(match => matchedFilePaths.add(match));
          } catch (error: any) {
            console.error(chalk.yellow(`Warning: Invalid pattern "${pattern}": ${error.message}`));
          }
        }

        // Convert matched paths to file objects with stat info
        const targetFiles = await Promise.all(
          Array.from(matchedFilePaths).map(async (filePath) => {
            const fullPath = path.join(sourceDir, filePath);
            const stats = await import('fs/promises').then(fs => fs.stat(fullPath));
            return {
              path: filePath,
              size: stats.size,
              mtime: stats.mtimeMs
            };
          })
        );

        // Create sync plan with options
        // Note: include/exclude patterns are used for to-codex direction.
        // For from-codex (routing-aware), these patterns are ignored to avoid
        // double filtering, since routing rules already determine which files sync.
        const syncOptions: SyncOptions = {
          direction,
          dryRun: options.dryRun,
          force: options.force,
          include: includePatterns,
          exclude: excludePatterns,
          // Pass pre-matched files to SDK (bypasses SDK's internal non-recursive scanning)
          sourceFiles: targetFiles
        };

        let plan;
        let routingScan;
        let codexRepoPath: string | undefined;

        // Use routing-aware sync for from-codex direction
        if (direction === 'from-codex') {

          try {
            const { ensureCodexCloned } = await import('../utils/codex-repository.js');

            if (!options.json) {
              console.log(chalk.blue('ℹ Cloning/updating codex repository...'));
            }

            // Clone codex to temp directory
            codexRepoPath = await ensureCodexCloned(config, {
              branch: targetBranch
            });

            if (!options.json) {
              console.log(chalk.dim(`  Codex cloned to: ${codexRepoPath}`));
              console.log(chalk.dim('  Scanning for files routing to this project...\n'));
            } else {
              console.log(JSON.stringify({
                info: 'Routing-aware sync: cloned codex repository and scanning for files targeting this project',
                codexPath: codexRepoPath
              }, null, 2));
            }
          } catch (error: any) {
            console.error(chalk.red('Error:'), 'Failed to clone codex repository');
            console.error(chalk.dim(`  ${error.message}`));

            // Provide error-specific troubleshooting
            console.log(chalk.yellow('\nTroubleshooting:'));
            if (error.message.includes('Git command not found')) {
              console.log(chalk.dim('  Git is not installed or not in PATH.'));
              console.log(chalk.dim('  Install git: https://git-scm.com/downloads'));
            } else if (error.message.includes('authentication failed') || error.message.includes('Authentication failed')) {
              console.log(chalk.dim('  GitHub authentication is required for private repositories.'));
              console.log(chalk.dim('  1. Check auth status: gh auth status'));
              console.log(chalk.dim('  2. Login if needed: gh auth login'));
              console.log(chalk.dim('  3. Or set GITHUB_TOKEN environment variable'));
            } else if (error.message.includes('Permission denied')) {
              console.log(chalk.dim('  Permission denied accessing repository files.'));
              console.log(chalk.dim('  1. Check file/directory permissions'));
              console.log(chalk.dim('  2. Ensure you have access to the repository'));
            } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
              console.log(chalk.dim(`  Repository not found: ${config.organization}/${(config as any).codex_repo || 'codex'}`));
              console.log(chalk.dim('  1. Verify the repository exists on GitHub'));
              console.log(chalk.dim('  2. Check organization and repository names in config'));
            } else {
              // Generic troubleshooting for other errors
              console.log(chalk.dim('  1. Ensure git is installed: git --version'));
              console.log(chalk.dim('  2. Check GitHub auth: gh auth status'));
              console.log(chalk.dim(`  3. Verify repo exists: ${config.organization}/${(config as any).codex_repo || 'codex'}`));
            }
            process.exit(1);
          }

          // Use temp clone path for routing scan
          const planWithRouting = await syncManager.createRoutingAwarePlan(
            config.organization,
            projectName,
            codexRepoPath,
            {
              ...syncOptions,
              codexRepo: 'codex_repo' in config ? (config as { codex_repo?: string }).codex_repo : undefined,
            }
          );

          plan = planWithRouting;
          routingScan = planWithRouting.routingScan;
        } else {
          // To-codex direction: clone codex, copy files, commit, push

          try {
            const { ensureCodexCloned } = await import('../utils/codex-repository.js');

            if (!options.json) {
              console.log(chalk.blue('ℹ Cloning/updating codex repository...'));
            }

            // Clone codex to temp directory
            codexRepoPath = await ensureCodexCloned(config, {
              branch: targetBranch
            });

            if (!options.json) {
              console.log(chalk.dim(`  Codex cloned to: ${codexRepoPath}`));
            }
          } catch (error: any) {
            console.error(chalk.red('Error:'), 'Failed to clone codex repository');
            console.error(chalk.dim(`  ${error.message}`));
            process.exit(1);
          }

          // For to-codex: sourceFiles = local files to upload, targetFiles = empty (assume all files are new)
          plan = await syncManager.createPlan(
            config.organization,
            projectName,
            sourceDir,
            [],  // Empty target - treat all files as creates
            syncOptions
          );

          // Set actual paths for execution
          // Source: local project directory
          // Target: codex repo / projects / project
          plan.source = sourceDir;
          plan.target = path.join(codexRepoPath, 'projects', projectName);
        }

        if (plan.totalFiles === 0) {
          if (options.json) {
            console.log(JSON.stringify({
              project: projectName,
              organization: config.organization,
              workId: options.workId || null,
              files: [],
              synced: 0,
              status: 'success',
              message: 'No files to sync'
            }, null, 2));
          } else {
            console.log(chalk.yellow('No files to sync.'));
          }
          return;
        }

        if (options.json) {
          const output = {
            project: projectName,
            organization: config.organization,
            environment: options.env,
            branch: targetBranch,
            direction,
            dryRun: options.dryRun || false,
            workId: options.workId || null,
            plan: {
              totalFiles: plan.totalFiles,
              totalBytes: plan.totalBytes,
              estimatedTime: plan.estimatedTime,
              conflicts: plan.conflicts.length,
              skipped: plan.skipped.length
            },
            files: plan.files.map(f => ({
              path: f.path,
              operation: f.operation,
              size: f.size
            }))
          };

          if (options.dryRun) {
            console.log(JSON.stringify({
              ...output,
              status: 'success'
            }, null, 2));
            return;
          }

          // Execute and add results
          const result = await syncManager.executePlan(plan, syncOptions);

          // Determine status: success, warning, or failure
          let status: 'success' | 'warning' | 'failure';
          if (!result.success && result.synced === 0) {
            status = 'failure';
          } else if (!result.success || result.failed > 0 || plan.conflicts.length > 0) {
            status = 'warning';
          } else {
            status = 'success';
          }

          console.log(JSON.stringify({
            ...output,
            status,
            result: {
              success: result.success,
              synced: result.synced,
              failed: result.failed,
              skipped: result.skipped,
              duration: result.duration,
              errors: result.errors
            }
          }, null, 2));
          return;
        }

        // Display sync plan
        console.log(chalk.bold('Sync Plan\n'));
        console.log(`  Project:      ${chalk.cyan(projectName)}`);
        console.log(`  Organization: ${chalk.cyan(config.organization)}`);
        console.log(`  Environment:  ${chalk.cyan(options.env)} (${targetBranch})`);
        console.log(`  Direction:    ${chalk.cyan(direction)}`);
        console.log(`  Files:        ${chalk.cyan(plan.totalFiles.toString())}`);
        console.log(`  Total size:   ${chalk.cyan(formatBytes(plan.totalBytes))}`);
        if (plan.estimatedTime) {
          console.log(`  Est. time:    ${chalk.dim(formatDuration(plan.estimatedTime))}`);
        }

        // Display routing statistics if using routing-aware sync
        if (routingScan) {
          console.log('');
          console.log(chalk.bold('Routing Statistics\n'));
          console.log(`  Scanned:      ${chalk.cyan(routingScan.stats.totalScanned.toString())} files`);
          console.log(`  Matched:      ${chalk.cyan(routingScan.stats.totalMatched.toString())} files`);
          console.log(`  Source projects: ${chalk.cyan(routingScan.stats.sourceProjects.length.toString())}`);
          if (routingScan.stats.sourceProjects.length > 0) {
            console.log(chalk.dim(`    ${routingScan.stats.sourceProjects.slice(0, 5).join(', ')}`));
            if (routingScan.stats.sourceProjects.length > 5) {
              console.log(chalk.dim(`    ... and ${routingScan.stats.sourceProjects.length - 5} more`));
            }
          }
          console.log(`  Scan time:    ${chalk.dim(formatDuration(routingScan.stats.durationMs))}`);
        }

        console.log('');

        if (plan.conflicts.length > 0) {
          console.log(chalk.yellow(`⚠ ${plan.conflicts.length} conflicts detected:`));
          for (const conflict of plan.conflicts.slice(0, 5)) {
            console.log(chalk.yellow(`  • ${conflict.path}`));
          }
          if (plan.conflicts.length > 5) {
            console.log(chalk.dim(`  ... and ${plan.conflicts.length - 5} more`));
          }
          console.log('');
        }

        if (plan.skipped.length > 0) {
          console.log(chalk.dim(`${plan.skipped.length} files skipped (no changes)`));
          console.log('');
        }

        if (options.dryRun) {
          console.log(chalk.blue('Dry run - would sync:\n'));

          const filesToShow = plan.files.slice(0, 10);
          for (const file of filesToShow) {
            const arrow = direction === 'to-codex' ? '→' : direction === 'from-codex' ? '←' : '↔';
            const opColor = file.operation === 'create' ? chalk.green :
                           file.operation === 'update' ? chalk.yellow :
                           chalk.dim;
            console.log(
              chalk.dim(`  ${arrow}`),
              opColor(file.operation.padEnd(7)),
              file.path,
              chalk.dim(`(${formatBytes(file.size || 0)})`)
            );
          }

          if (plan.files.length > 10) {
            console.log(chalk.dim(`  ... and ${plan.files.length - 10} more files`));
          }

          console.log(chalk.dim(`\nTotal: ${plan.totalFiles} files (${formatBytes(plan.totalBytes)})`));
          console.log(chalk.dim('Run without --dry-run to execute sync.'));
          return;
        }

        // Execute sync
        console.log(chalk.blue('Syncing...\n'));

        const startTime = Date.now();
        const result = await syncManager.executePlan(plan, syncOptions);
        const duration = Date.now() - startTime;

        // For to-codex: commit and push changes using @fractary/core RepoManager
        if (direction === 'to-codex' && codexRepoPath && result.synced > 0) {
          try {
            if (!options.json) {
              console.log(chalk.blue('Committing and pushing to codex...'));
            }

            const { RepoManager } = await import('@fractary/core/repo');
            const repoManager = new RepoManager({ platform: 'github' }, codexRepoPath);

            // Stage all changes
            repoManager.stageAll();

            // Check if there are any changes to commit
            if (repoManager.isClean()) {
              if (!options.json) {
                console.log(chalk.dim('  No changes to push - codex is already up to date'));
              }
            } else {
              // Commit with conventional format
              repoManager.commit({
                message: `Sync ${result.synced} files from ${projectName}`,
              });

              // Push to remote
              repoManager.push({});

              if (!options.json) {
                console.log(chalk.dim('  Changes pushed to codex repository'));
              }
            }
          } catch (error: any) {
            console.error(chalk.red('Error pushing to codex:'), error.message);
          }
        }

        // Summary
        console.log('');
        if (result.success) {
          console.log(chalk.green(`✓ Sync completed successfully`));
          console.log(chalk.dim(`  Synced: ${result.synced} files`));
          if (result.skipped > 0) {
            console.log(chalk.dim(`  Skipped: ${result.skipped} files`));
          }
          console.log(chalk.dim(`  Duration: ${formatDuration(duration)}`));
        } else {
          console.log(chalk.yellow(`⚠ Sync completed with errors`));
          console.log(chalk.green(`  Synced: ${result.synced} files`));
          console.log(chalk.red(`  Failed: ${result.failed} files`));
          if (result.skipped > 0) {
            console.log(chalk.dim(`  Skipped: ${result.skipped} files`));
          }

          if (result.errors.length > 0) {
            console.log('');
            console.log(chalk.red('Errors:'));
            for (const error of result.errors.slice(0, 5)) {
              console.log(chalk.red(`  • ${error.path}: ${error.error}`));
            }
            if (result.errors.length > 5) {
              console.log(chalk.dim(`  ... and ${result.errors.length - 5} more errors`));
            }
          }
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
