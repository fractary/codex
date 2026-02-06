/**
 * Health command (v3.0)
 *
 * Comprehensive diagnostics for codex SDK setup using SDK's HealthChecker.
 * This is a thin wrapper around the centralized health checking logic in the SDK.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { createHealthChecker, type HealthCheck, type HealthResult } from '@fractary/codex'
import { getClient } from '../../client/get-client'

export function cacheHealthCommand(): Command {
  const cmd = new Command('cache-health')

  cmd
    .description('Run diagnostics on codex setup')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Create health checker
        const healthChecker = createHealthChecker({
          projectRoot: process.cwd(),
        })

        // Run configuration and storage checks (don't require client)
        const checks: HealthCheck[] = []

        checks.push(await healthChecker.checkConfiguration())
        checks.push(await healthChecker.checkStorage())

        // Try to get client for cache and type registry checks
        try {
          const client = await getClient()

          // Check SDK client initialization
          const organization = client.getOrganization()
          checks.push({
            name: 'SDK Client',
            status: 'pass',
            message: 'CodexClient initialized successfully',
            details: `Organization: ${organization}`,
          })

          // Check cache using client's stats
          const cacheStats = await client.getCacheStats()
          checks.push(healthChecker.checkCacheFromStats(cacheStats))

          // Check type registry using client's registry
          const registry = client.getTypeRegistry()
          checks.push(healthChecker.checkTypesFromRegistry(registry))
        } catch (error: any) {
          // Client initialization failed
          checks.push({
            name: 'SDK Client',
            status: 'fail',
            message: 'Failed to initialize CodexClient',
            details: error.message,
          })

          // Add placeholder checks for cache and types
          checks.push({
            name: 'Cache',
            status: 'warn',
            message: 'Cache check skipped',
            details: 'SDK client not available',
          })

          checks.push({
            name: 'Type Registry',
            status: 'warn',
            message: 'Type registry check skipped',
            details: 'SDK client not available',
          })
        }

        // Summarize results
        const result: HealthResult = healthChecker.summarize(checks)

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
          return
        }

        // Display results
        console.log(chalk.bold('Codex Health Check\n'))

        for (const check of result.checks) {
          const icon =
            check.status === 'pass'
              ? chalk.green('✓')
              : check.status === 'warn'
                ? chalk.yellow('⚠')
                : chalk.red('✗')

          const statusColor =
            check.status === 'pass' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red

          console.log(`${icon} ${chalk.bold(check.name)}`)
          console.log(`  ${statusColor(check.message)}`)
          if (check.details) {
            console.log(`  ${chalk.dim(check.details)}`)
          }
          console.log('')
        }

        // Summary
        console.log(chalk.dim('─'.repeat(60)))

        const overallStatus =
          result.summary.status === 'unhealthy'
            ? chalk.red('UNHEALTHY')
            : result.summary.status === 'degraded'
              ? chalk.yellow('DEGRADED')
              : chalk.green('HEALTHY')

        console.log(`Status: ${overallStatus}`)
        console.log(
          chalk.dim(`${result.summary.passed} passed, ${result.summary.warned} warnings, ${result.summary.failed} failed`)
        )

        if (result.summary.failed > 0 || result.summary.warned > 0) {
          console.log('')
          console.log(chalk.dim('Run checks individually for more details:'))
          console.log(chalk.dim('  fractary-codex cache-stats'))
        }

        // Exit with error if any checks failed
        if (result.summary.failed > 0) {
          process.exit(1)
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  return cmd
}
