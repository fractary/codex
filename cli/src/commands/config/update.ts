/**
 * config-update command
 *
 * Updates specific fields in the existing codex section of .fractary/config.yaml.
 * Only modifies the fields that are explicitly provided.
 *
 * Requires: codex section to exist (run `config-initialize` first)
 */

import { Command } from 'commander'
import chalk from 'chalk'
import {
  createConfigManager,
  type CodexUpdateOptions,
} from '@fractary/codex'

export function configUpdateCommand(): Command {
  const cmd = new Command('config-update')

  cmd
    .description('Update codex configuration fields in .fractary/config.yaml')
    .option('--org <slug>', 'Update organization slug')
    .option('--project <name>', 'Update project name')
    .option('--codex-repo <name>', 'Update codex repository name')
    .option('--sync-preset <name>', 'Update sync preset (standard, minimal)')
    .option('--no-mcp', 'Skip MCP server update')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const configManager = createConfigManager(process.cwd())

        // Build update options from provided flags
        const updateOptions: CodexUpdateOptions = {
          skipMcp: options.mcp === false,
        }

        let hasUpdates = false

        if (options.org !== undefined) {
          updateOptions.organization = options.org
          hasUpdates = true
        }

        if (options.project !== undefined) {
          updateOptions.project = options.project
          hasUpdates = true
        }

        if (options.codexRepo !== undefined) {
          updateOptions.codexRepo = options.codexRepo
          hasUpdates = true
        }

        if (options.syncPreset !== undefined) {
          updateOptions.syncPreset = options.syncPreset
          hasUpdates = true
        }

        if (!hasUpdates) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'No fields to update. Provide at least one of: --org, --project, --codex-repo, --sync-preset' }, null, 2))
          } else {
            console.error(chalk.red('Error:'), 'No fields to update. Provide at least one of: --org, --project, --codex-repo, --sync-preset')
          }
          process.exit(1)
        }

        if (!options.json) {
          console.log(chalk.blue('Updating codex configuration...\n'))
        }

        const result = await configManager.updateCodexSection(updateOptions)

        // JSON output
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                success: true,
                configPath: result.configPath,
                fieldsUpdated: result.fieldsUpdated,
                mcp: result.mcp,
              },
              null,
              2
            )
          )
          return
        }

        // Human-readable output
        if (result.fieldsUpdated.length === 0) {
          console.log(chalk.yellow('No fields were updated.'))
          return
        }

        for (const field of result.fieldsUpdated) {
          console.log(chalk.green('✓'), chalk.dim(`Updated: ${field}`))
        }

        if (result.mcp) {
          if (result.mcp.alreadyInstalled) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (already configured)'))
          } else if (result.mcp.installed) {
            console.log(chalk.green('✓'), chalk.dim('.mcp.json (updated)'))
          }
        }

        console.log(chalk.green('\n✓ Codex configuration updated successfully!'))
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
