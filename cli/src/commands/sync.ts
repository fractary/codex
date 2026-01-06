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
  SyncOptions
} from '@fractary/codex';
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

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
    .action(async (name: string | undefined, options) => {
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

        // Dynamic import to avoid loading SDK at module time
        const { createSyncManager, createLocalStorage, detectCurrentProject } = await import('@fractary/codex');

        // Determine project name
        let projectName = name;
        if (!projectName) {
          const detected = detectCurrentProject();
          projectName = detected.project || undefined;
        }

        if (!projectName) {
          console.error(chalk.red('Error:'), 'Could not determine project name.');
          console.log(chalk.dim('Provide project name as argument or run from a git repository.'));
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
        // Cast config.sync to any to avoid type incompatibility between CLI and SDK SyncConfig types
        const syncManager = createSyncManager({
          localStorage,
          config: config.sync as any,
          manifestPath: path.join(process.cwd(), '.fractary', '.codex-sync-manifest.json')
        });

        // Get default include patterns from config
        // The CLI config uses 'exclude' patterns, fall back to standard patterns for include
        const defaultPatterns = [
          'docs/**/*.md',
          'specs/**/*.md',
          '.fractary/standards/**',
          '.fractary/templates/**'
        ];

        // Combine config patterns with CLI options
        const includePatterns = options.include.length > 0 ? options.include : defaultPatterns;
        const excludePatterns = [
          ...(config.sync?.exclude || []),
          ...options.exclude
        ];

        // Scan local files
        const sourceDir = process.cwd();
        const allFiles = await syncManager.listLocalFiles(sourceDir);

        // Filter files by patterns (simple implementation)
        const targetFiles = allFiles.filter(file => {
          // Check exclude patterns first
          for (const pattern of excludePatterns) {
            const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
            if (regex.test(file.path)) {
              return false;
            }
          }

          // Check include patterns
          for (const pattern of includePatterns) {
            const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
            if (regex.test(file.path)) {
              return true;
            }
          }

          return false;
        });

        // Create sync plan
        const syncOptions: SyncOptions = {
          direction,
          dryRun: options.dryRun,
          force: options.force,
          include: includePatterns,
          exclude: excludePatterns
        };

        let plan;
        let routingScan;

        // Use routing-aware sync for from-codex direction
        if (direction === 'from-codex') {
          let codexRepoPath: string;

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
            console.log(chalk.yellow('\nTroubleshooting:'));
            console.log(chalk.dim('  1. Ensure git is installed: git --version'));
            console.log(chalk.dim('  2. Check GitHub auth: gh auth status'));
            console.log(chalk.dim(`  3. Verify repo exists: ${config.organization}/${(config as any).codex_repository || 'codex'}`));
            process.exit(1);
          }

          // Use temp clone path for routing scan
          const planWithRouting = await syncManager.createRoutingAwarePlan(
            config.organization,
            projectName,
            codexRepoPath,
            syncOptions
          );

          plan = planWithRouting;
          routingScan = planWithRouting.routingScan;
        } else {
          plan = await syncManager.createPlan(
            config.organization,
            projectName,
            sourceDir,
            targetFiles,
            syncOptions
          );
        }

        if (plan.totalFiles === 0) {
          if (options.json) {
            console.log(JSON.stringify({
              project: projectName,
              organization: config.organization,
              files: [],
              synced: 0
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
            console.log(JSON.stringify(output, null, 2));
            return;
          }

          // Execute and add results
          const result = await syncManager.executePlan(plan, syncOptions);
          console.log(JSON.stringify({
            ...output,
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
