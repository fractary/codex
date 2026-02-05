/**
 * Configure Codex project command
 *
 * Creates .fractary/config.yaml (unified config) using SDK's ConfigManager.
 * This command is a thin wrapper around the SDK's centralized configuration logic.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import {
  createConfigManager,
  validateNameFormat,
  resolveOrganization,
  type DiscoverCodexRepoResult,
} from '@fractary/codex'

export function configureCommand(): Command {
  const cmd = new Command('configure')

  cmd
    .description('Initialize unified Fractary configuration (.fractary/config.yaml)')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--project <name>', 'Project name (default: derived from directory)')
    .option('--codex-repo <name>', 'Codex repository name (e.g., "codex.fractary.com")')
    .option('--sync-preset <name>', 'Sync preset (standard, minimal)', 'standard')
    .option('--force', 'Overwrite existing configuration')
    .option('--no-mcp', 'Skip MCP server installation')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const configManager = createConfigManager(process.cwd())

        if (!options.json) {
          console.log(chalk.blue('Initializing unified Fractary configuration...\n'))
        }

        // Resolve organization
        let org = options.org

        if (!org) {
          // Try git remote detection via SDK
          org = await configManager.detectOrganization()
        }

        if (!org) {
          // Try SDK's resolveOrganization
          try {
            org = resolveOrganization({
              repoName: path.basename(process.cwd()),
            })
          } catch {
            // SDK method failed, continue
          }
        }

        if (!org) {
          // Default fallback
          org = path.basename(process.cwd()).split('-')[0] || 'default'
          if (!options.json) {
            console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`))
            console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'))
          }
        } else if (!options.json) {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`))
        }

        // Validate organization name format
        const orgValidation = validateNameFormat(org, 'organization')
        if (!orgValidation.valid) {
          if (options.json) {
            console.log(JSON.stringify({ error: orgValidation.error }, null, 2))
          } else {
            console.error(chalk.red('Error:'), orgValidation.error)
          }
          process.exit(1)
        }

        // Resolve project name
        let project = options.project
        if (!project) {
          project = configManager.detectProject()
          if (!options.json) {
            console.log(chalk.dim(`Project: ${chalk.cyan(project)}\n`))
          }
        }

        // Resolve codex repository
        let codexRepo = options.codexRepo

        // Validate codex repo if provided via CLI
        if (codexRepo) {
          const repoValidation = validateNameFormat(codexRepo, 'repository')
          if (!repoValidation.valid) {
            if (options.json) {
              console.log(JSON.stringify({ error: repoValidation.error }, null, 2))
            } else {
              console.error(chalk.red('Error:'), repoValidation.error)
            }
            process.exit(1)
          }
          if (!options.json) {
            console.log(chalk.dim(`Codex repository: ${chalk.cyan(codexRepo)}\n`))
          }
        } else {
          // Try to discover codex repo in the organization
          const discoveryResult: DiscoverCodexRepoResult = await configManager.discoverCodexRepo(org)
          if (discoveryResult.repo) {
            codexRepo = discoveryResult.repo
            if (!options.json) {
              console.log(chalk.dim(`Codex repository: ${chalk.cyan(codexRepo)} (auto-discovered)\n`))
            }
          } else if (!options.json) {
            // Log specific error for debugging
            if (discoveryResult.message) {
              console.log(chalk.dim(`  Note: ${discoveryResult.message}\n`))
            }
          }
        }

        if (!codexRepo) {
          if (!options.json) {
            console.log(chalk.yellow(`⚠ Could not discover codex repository in organization '${org}'`))
            console.log(chalk.dim('  Use --codex-repo <name> to specify explicitly'))
            console.log(chalk.dim('  Expected naming convention: codex.{org}.{tld} (e.g., codex.fractary.com)\n'))
          }
          // Use a placeholder that makes it clear it needs to be configured
          codexRepo = `codex.${org}.com`
          if (!options.json) {
            console.log(chalk.dim(`  Using default: ${chalk.cyan(codexRepo)}\n`))
          }
        }

        // Check if config exists
        const configExists = await configManager.configExists()

        if (configExists && !options.force) {
          if (!options.json) {
            console.log(chalk.yellow(`⚠ Configuration already exists at .fractary/config.yaml`))
            console.log(chalk.dim('Merging with existing configuration...\n'))
          }
        }

        // Initialize configuration using SDK's ConfigManager
        if (!options.json) {
          console.log('Creating directory structure...')
        }

        const result = await configManager.initialize({
          organization: org,
          project,
          codexRepo,
          syncPreset: options.syncPreset,
          force: options.force,
          skipMcp: options.mcp === false,
          includeFilePlugin: true,
        })

        // JSON output
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                configPath: result.configPath,
                created: result.configCreated,
                merged: result.configMerged,
                organization: org,
                project,
                codexRepo,
                directories: result.directories,
                gitignore: result.gitignore,
                mcp: result.mcp,
              },
              null,
              2
            )
          )
          return
        }

        // Human-readable output
        for (const dir of result.directories.created) {
          console.log(chalk.green('✓'), chalk.dim(dir + '/'))
        }
        for (const dir of result.directories.alreadyExisted) {
          console.log(chalk.dim('  ' + dir + '/ (exists)'))
        }

        if (result.gitignore.created) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (created)'))
        } else if (result.gitignore.updated) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (updated)'))
        } else {
          console.log(chalk.green('✓'), chalk.dim('.fractary/.gitignore (exists)'))
        }

        console.log('\nInitializing configuration...')

        if (result.configCreated) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (created)'))
        } else if (result.configMerged) {
          console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (merged with existing)'))
        }

        // MCP server status
        if (result.mcp) {
          console.log('\nConfiguring MCP server...')
          if (result.mcp.alreadyInstalled) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (already configured)'))
          } else if (result.mcp.migrated) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (migrated from old format)'))
            if (result.mcp.backupPath) {
              console.log(chalk.dim(`  Backup: ${path.basename(result.mcp.backupPath)}`))
            }
          } else if (result.mcp.installed) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (created)'))
          }
        }

        // Success message
        console.log(chalk.green('\n✓ Unified configuration initialized successfully!\n'))

        console.log(chalk.bold('Configuration:'))
        console.log(chalk.dim(`  Organization: ${org}`))
        console.log(chalk.dim(`  Project: ${project}`))
        console.log(chalk.dim(`  Codex Repository: ${codexRepo}`))
        console.log(chalk.dim(`  Config: .fractary/config.yaml`))

        console.log(chalk.bold('\nFile plugin sources:'))
        console.log(chalk.dim('  - specs: .fractary/specs/ → S3'))
        console.log(chalk.dim('  - logs: .fractary/logs/ → S3'))

        console.log(chalk.bold('\nCodex plugin:'))
        console.log(chalk.dim('  - Cache: .fractary/codex/cache/'))
        console.log(chalk.dim('  - MCP Server: @fractary/codex-mcp (via npx)'))
        console.log(chalk.dim('  - Remotes: codex repo configured'))

        console.log(chalk.bold('\nGit Authentication:'))
        console.log(chalk.dim('  Codex sync uses your existing git credentials.'))
        console.log(chalk.dim('  Ensure you have access to the codex repository:'))
        console.log(chalk.dim(`    gh repo view ${org}/${codexRepo}`))
        console.log(chalk.dim('  Or set GITHUB_TOKEN environment variable.'))

        console.log(chalk.bold('\nNext steps:'))
        console.log(chalk.dim('  1. Restart Claude Code to load the MCP server'))
        console.log(chalk.dim('  2. Verify codex repository access: gh repo view ' + org + '/' + codexRepo))
        console.log(chalk.dim('  3. Configure AWS credentials for S3 access (if using file plugin)'))
        console.log(chalk.dim('  4. Edit .fractary/config.yaml to add external project remotes'))
        console.log(chalk.dim('  5. Reference docs via codex:// URIs (auto-fetched by MCP)'))
      } catch (error: any) {
        if (options.json) {
          console.log(JSON.stringify({ error: error.message }, null, 2))
        } else {
          console.error(chalk.red('Error:'), error.message)
        }
        process.exit(1)
      }
    })

  return cmd
}
