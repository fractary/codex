/**
 * config-initialize command
 *
 * Adds the codex section to an existing .fractary/config.yaml (created by @fractary/core).
 * Sets up codex-specific directories, gitignore entries, and MCP server configuration.
 *
 * Requires: .fractary/config.yaml to exist (run `fractary config-initialize` first)
 * Fails if: codex section already exists (unless --force)
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

export function configInitializeCommand(): Command {
  const cmd = new Command('config-initialize')

  cmd
    .description('Initialize codex section in .fractary/config.yaml (requires base config from @fractary/core)')
    .option('--org <slug>', 'Organization slug (e.g., "fractary")')
    .option('--project <name>', 'Project name (default: derived from directory)')
    .option('--codex-repo <name>', 'Codex repository name (e.g., "codex.fractary.com")')
    .option('--sync-preset <name>', 'Sync preset (standard, minimal)', 'standard')
    .option('--force', 'Overwrite existing codex section')
    .option('--no-mcp', 'Skip MCP server installation')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const configManager = createConfigManager(process.cwd())

        if (!options.json) {
          console.log(chalk.blue('Initializing codex configuration...\n'))
        }

        // Resolve organization
        let org = options.org

        if (!org) {
          org = await configManager.detectOrganization()
        }

        if (!org) {
          try {
            org = resolveOrganization({
              repoName: path.basename(process.cwd()),
            })
          } catch {
            // continue
          }
        }

        if (!org) {
          org = path.basename(process.cwd()).split('-')[0] || 'default'
          if (!options.json) {
            console.log(chalk.yellow(`⚠ Could not detect organization, using: ${org}`))
            console.log(chalk.dim('  Use --org <slug> to specify explicitly\n'))
          }
        } else if (!options.json) {
          console.log(chalk.dim(`Organization: ${chalk.cyan(org)}\n`))
        }

        // Validate organization
        const orgValidation = validateNameFormat(org, 'organization')
        if (!orgValidation.valid) {
          if (options.json) {
            console.log(JSON.stringify({ error: orgValidation.error }, null, 2))
          } else {
            console.error(chalk.red('Error:'), orgValidation.error)
          }
          process.exit(1)
        }

        // Resolve project
        let project = options.project
        if (!project) {
          project = configManager.detectProject()
          if (!options.json) {
            console.log(chalk.dim(`Project: ${chalk.cyan(project)}\n`))
          }
        }

        // Resolve codex repository
        let codexRepo = options.codexRepo

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
          const discoveryResult: DiscoverCodexRepoResult = await configManager.discoverCodexRepo(org)
          if (discoveryResult.repo) {
            codexRepo = discoveryResult.repo
            if (!options.json) {
              console.log(chalk.dim(`Codex repository: ${chalk.cyan(codexRepo)} (auto-discovered)\n`))
            }
          } else if (!options.json) {
            if (discoveryResult.message) {
              console.log(chalk.dim(`  Note: ${discoveryResult.message}\n`))
            }
          }
        }

        if (!codexRepo) {
          codexRepo = `codex.${org}.com`
          if (!options.json) {
            console.log(chalk.yellow(`⚠ Could not discover codex repository in organization '${org}'`))
            console.log(chalk.dim(`  Using default: ${chalk.cyan(codexRepo)}\n`))
          }
        }

        // Initialize codex section
        const result = await configManager.initializeCodexSection({
          organization: org,
          project,
          codexRepo,
          syncPreset: options.syncPreset,
          force: options.force,
          skipMcp: options.mcp === false,
        })

        // JSON output
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                configPath: result.configPath,
                codexSectionCreated: result.codexSectionCreated,
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
        console.log('Setting up codex directories...')
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

        console.log(chalk.green('✓'), chalk.dim('.fractary/config.yaml (codex section added)'))

        if (result.mcp) {
          if (result.mcp.alreadyInstalled) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (already configured)'))
          } else if (result.mcp.migrated) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (migrated from old format)'))
          } else if (result.mcp.installed) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (created)'))
          }
        }

        console.log(chalk.green('\n✓ Codex configuration initialized successfully!\n'))

        console.log(chalk.bold('Configuration:'))
        console.log(chalk.dim(`  Organization: ${org}`))
        console.log(chalk.dim(`  Project: ${project}`))
        console.log(chalk.dim(`  Codex Repository: ${codexRepo}`))

        console.log(chalk.bold('\nNext steps:'))
        console.log(chalk.dim('  1. Restart Claude Code to load the MCP server'))
        console.log(chalk.dim(`  2. Verify codex repository access: gh repo view ${org}/${codexRepo}`))
        console.log(chalk.dim('  3. Run first sync: /fractary-codex:sync --from-codex --dry-run'))
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
