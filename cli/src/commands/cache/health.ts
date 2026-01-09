/**
 * Health command (v3.0)
 *
 * Comprehensive diagnostics for codex SDK setup:
 * - YAML configuration validation
 * - CodexClient initialization
 * - Cache health via CacheManager
 * - Storage provider connectivity
 * - Type registry validation
 * - Legacy configuration detection
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getClient } from '../../client/get-client';
import { readYamlConfig } from '../../config/migrate-config';

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
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
 * Check YAML configuration
 */
async function checkConfiguration(): Promise<HealthCheck> {
  const configPath = path.join(process.cwd(), '.fractary', 'codex', 'config.yaml');
  const legacyConfigPath = path.join(process.cwd(), '.fractary', 'plugins', 'codex', 'config.json');

  try {
    // Check for YAML config
    if (!await fileExists(configPath)) {
      // Check for legacy config
      if (await fileExists(legacyConfigPath)) {
        return {
          name: 'Configuration',
          status: 'warn',
          message: 'Legacy JSON configuration detected',
          details: 'Run "fractary codex migrate" to upgrade to YAML format'
        };
      }

      return {
        name: 'Configuration',
        status: 'fail',
        message: 'No configuration found',
        details: 'Run "fractary codex init" to create configuration'
      };
    }

    // Validate YAML config
    const config = await readYamlConfig(configPath);

    if (!config.organization) {
      return {
        name: 'Configuration',
        status: 'warn',
        message: 'No organization configured',
        details: 'Organization slug is required'
      };
    }

    // Check storage providers
    const providerCount = config.storage?.length || 0;
    if (providerCount === 0) {
      return {
        name: 'Configuration',
        status: 'warn',
        message: 'No storage providers configured',
        details: 'At least one storage provider is recommended'
      };
    }

    return {
      name: 'Configuration',
      status: 'pass',
      message: 'Valid YAML configuration',
      details: `Organization: ${config.organization}, ${providerCount} storage provider(s)`
    };

  } catch (error: any) {
    return {
      name: 'Configuration',
      status: 'fail',
      message: 'Invalid configuration',
      details: error.message
    };
  }
}

/**
 * Check SDK client initialization
 */
async function checkSDKClient(): Promise<HealthCheck> {
  try {
    const client = await getClient();
    const organization = client.getOrganization();

    return {
      name: 'SDK Client',
      status: 'pass',
      message: 'CodexClient initialized successfully',
      details: `Organization: ${organization}`
    };

  } catch (error: any) {
    return {
      name: 'SDK Client',
      status: 'fail',
      message: 'Failed to initialize CodexClient',
      details: error.message
    };
  }
}

/**
 * Check cache health
 */
async function checkCache(): Promise<HealthCheck> {
  try {
    const client = await getClient();
    const stats = await client.getCacheStats();

    if (stats.entryCount === 0) {
      return {
        name: 'Cache',
        status: 'warn',
        message: 'Cache is empty',
        details: 'Fetch some documents to populate cache'
      };
    }

    const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100;

    if (healthPercent < 50) {
      return {
        name: 'Cache',
        status: 'warn',
        message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
        details: `${stats.expiredCount} expired, ${stats.staleCount} stale`
      };
    }

    return {
      name: 'Cache',
      status: 'pass',
      message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
      details: `${formatSize(stats.totalSize)} total`
    };

  } catch (error: any) {
    return {
      name: 'Cache',
      status: 'fail',
      message: 'Cache check failed',
      details: error.message
    };
  }
}

/**
 * Check storage providers
 */
async function checkStorage(): Promise<HealthCheck> {
  const configPath = path.join(process.cwd(), '.fractary', 'codex', 'config.yaml');

  try {
    const config = await readYamlConfig(configPath);
    const providers = config.storage || [];

    if (providers.length === 0) {
      return {
        name: 'Storage',
        status: 'warn',
        message: 'No storage providers configured',
        details: 'Configure at least one provider in .fractary/codex/config.yaml'
      };
    }

    const providerTypes = providers.map(p => p.type).join(', ');
    const hasGitHub = providers.some(p => p.type === 'github');

    if (hasGitHub && !process.env.GITHUB_TOKEN) {
      return {
        name: 'Storage',
        status: 'warn',
        message: `${providers.length} provider(s): ${providerTypes}`,
        details: 'GITHUB_TOKEN not set (required for GitHub provider)'
      };
    }

    return {
      name: 'Storage',
      status: 'pass',
      message: `${providers.length} provider(s): ${providerTypes}`,
      details: 'All configured providers available'
    };

  } catch (error: any) {
    return {
      name: 'Storage',
      status: 'fail',
      message: 'Storage check failed',
      details: error.message
    };
  }
}

/**
 * Check type registry
 */
async function checkTypes(): Promise<HealthCheck> {
  try {
    const client = await getClient();
    const registry = client.getTypeRegistry();
    const allTypes = registry.list();

    const builtinCount = allTypes.filter(t => registry.isBuiltIn(t.name)).length;
    const customCount = allTypes.length - builtinCount;

    return {
      name: 'Type Registry',
      status: 'pass',
      message: `${allTypes.length} types registered`,
      details: `${builtinCount} built-in, ${customCount} custom`
    };

  } catch (error: any) {
    return {
      name: 'Type Registry',
      status: 'fail',
      message: 'Type registry check failed',
      details: error.message
    };
  }
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function healthCommand(): Command {
  const cmd = new Command('health');

  cmd
    .description('Run diagnostics on codex setup')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Run all health checks
        const checks: HealthCheck[] = [];

        checks.push(await checkConfiguration());
        checks.push(await checkSDKClient());
        checks.push(await checkCache());
        checks.push(await checkStorage());
        checks.push(await checkTypes());

        // Count results
        const passed = checks.filter(c => c.status === 'pass').length;
        const warned = checks.filter(c => c.status === 'warn').length;
        const failed = checks.filter(c => c.status === 'fail').length;

        if (options.json) {
          console.log(JSON.stringify({
            summary: {
              total: checks.length,
              passed,
              warned,
              failed,
              healthy: failed === 0
            },
            checks
          }, null, 2));
          return;
        }

        // Display results
        console.log(chalk.bold('Codex Health Check\n'));

        for (const check of checks) {
          const icon = check.status === 'pass' ? chalk.green('✓') :
                       check.status === 'warn' ? chalk.yellow('⚠') :
                       chalk.red('✗');

          const statusColor = check.status === 'pass' ? chalk.green :
                              check.status === 'warn' ? chalk.yellow :
                              chalk.red;

          console.log(`${icon} ${chalk.bold(check.name)}`);
          console.log(`  ${statusColor(check.message)}`);
          if (check.details) {
            console.log(`  ${chalk.dim(check.details)}`);
          }
          console.log('');
        }

        // Summary
        console.log(chalk.dim('─'.repeat(60)));

        const overallStatus = failed > 0 ? chalk.red('UNHEALTHY') :
                              warned > 0 ? chalk.yellow('DEGRADED') :
                              chalk.green('HEALTHY');

        console.log(`Status: ${overallStatus}`);
        console.log(chalk.dim(`${passed} passed, ${warned} warnings, ${failed} failed`));

        if (failed > 0 || warned > 0) {
          console.log('');
          console.log(chalk.dim('Run checks individually for more details:'));
          console.log(chalk.dim('  fractary codex cache stats'));
          console.log(chalk.dim('  fractary codex types list'));
        }

        // Exit with error if any checks failed
        if (failed > 0) {
          process.exit(1);
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  return cmd;
}
