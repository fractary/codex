/**
 * config-validate command
 *
 * Validates the codex section of .fractary/config.yaml.
 * Read-only operation - never modifies any files.
 *
 * Checks: schema structure, field formats, directory existence, MCP config, gitignore.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { createConfigManager } from '@fractary/codex'

export function configValidateCommand(): Command {
  const cmd = new Command('config-validate')

  cmd
    .description('Validate codex configuration in .fractary/config.yaml (read-only)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const configManager = createConfigManager(process.cwd())

        if (!options.json) {
          console.log(chalk.blue('Validating codex configuration...\n'))
        }

        const result = await configManager.validateCodexConfig()

        // JSON output
        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
          if (!result.valid) {
            process.exit(1)
          }
          return
        }

        // Human-readable output
        if (result.errors.length > 0) {
          console.log(chalk.red.bold('Errors:'))
          for (const error of result.errors) {
            console.log(chalk.red('  ✗'), `${error.field}: ${error.message}`)
          }
          console.log()
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow.bold('Warnings:'))
          for (const warning of result.warnings) {
            console.log(chalk.yellow('  ⚠'), `${warning.field}: ${warning.message}`)
          }
          console.log()
        }

        if (result.valid) {
          if (result.warnings.length === 0) {
            console.log(chalk.green('✓ Codex configuration is valid with no warnings.'))
          } else {
            console.log(chalk.green('✓ Codex configuration is valid'), chalk.yellow(`(${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''})`))
          }
        } else {
          console.log(chalk.red(`✗ Codex configuration is invalid (${result.errors.length} error${result.errors.length > 1 ? 's' : ''})`))
          process.exit(1)
        }
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
