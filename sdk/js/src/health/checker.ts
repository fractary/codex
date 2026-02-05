/**
 * HealthChecker - Comprehensive diagnostics for Codex SDK
 *
 * Provides health checks for:
 * - Configuration validation
 * - Cache health
 * - Storage provider connectivity
 * - Type registry validation
 *
 * This centralizes health check logic that was previously in CLI.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { CacheManager, type CacheStats } from '../cache/index.js'
import { TypeRegistry } from '../types/index.js'
import { formatBytes } from '../core/utils/index.js'

// ===== Types =====

/**
 * Health check status
 */
export type HealthStatus = 'pass' | 'warn' | 'fail'

/**
 * Individual health check result
 */
export interface HealthCheck {
  /** Name of the check */
  name: string
  /** Status: pass, warn, or fail */
  status: HealthStatus
  /** Human-readable message */
  message: string
  /** Additional details */
  details?: string
}

/**
 * Health check summary
 */
export interface HealthSummary {
  /** Total number of checks */
  total: number
  /** Number of passed checks */
  passed: number
  /** Number of warning checks */
  warned: number
  /** Number of failed checks */
  failed: number
  /** Overall health status */
  healthy: boolean
  /** Overall status string */
  status: 'healthy' | 'degraded' | 'unhealthy'
}

/**
 * Complete health check result
 */
export interface HealthResult {
  /** Summary of all checks */
  summary: HealthSummary
  /** Individual check results */
  checks: HealthCheck[]
}

/**
 * Storage provider configuration for health checks
 */
export interface StorageProviderInfo {
  type: string
  [key: string]: unknown
}

/**
 * Configuration for health checks
 */
export interface HealthConfig {
  /** Organization name */
  organization?: string
  /** Storage providers */
  storage?: StorageProviderInfo[]
  /** Codex configuration section */
  codex?: {
    organization?: string
    codex_repo?: string
  }
}

/**
 * Options for HealthChecker
 */
export interface HealthCheckerOptions {
  /** Project root directory */
  projectRoot?: string
  /** Cache manager instance */
  cacheManager?: CacheManager
  /** Type registry instance */
  typeRegistry?: TypeRegistry
  /** Pre-loaded configuration */
  config?: HealthConfig
}

// ===== Helper Functions =====

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Read and parse YAML config
 */
async function readYamlConfig(configPath: string): Promise<HealthConfig | null> {
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const yaml = await import('js-yaml')
    return yaml.load(content) as HealthConfig
  } catch {
    return null
  }
}

// ===== HealthChecker Class =====

/**
 * HealthChecker - Runs comprehensive diagnostics
 */
export class HealthChecker {
  private projectRoot: string
  private cacheManager?: CacheManager
  private typeRegistry?: TypeRegistry
  private config?: HealthConfig

  constructor(options: HealthCheckerOptions = {}) {
    this.projectRoot = options.projectRoot || process.cwd()
    this.cacheManager = options.cacheManager
    this.typeRegistry = options.typeRegistry
    this.config = options.config
  }

  /**
   * Get configuration path
   */
  getConfigPath(): string {
    return path.join(this.projectRoot, '.fractary', 'config.yaml')
  }

  /**
   * Get legacy configuration path
   */
  getLegacyConfigPath(): string {
    return path.join(this.projectRoot, '.fractary', 'plugins', 'codex', 'config.json')
  }

  /**
   * Check configuration health
   */
  async checkConfiguration(): Promise<HealthCheck> {
    const configPath = this.getConfigPath()
    const legacyConfigPath = this.getLegacyConfigPath()

    try {
      // Check for YAML config
      if (!(await fileExists(configPath))) {
        // Check for legacy config
        if (await fileExists(legacyConfigPath)) {
          return {
            name: 'Configuration',
            status: 'warn',
            message: 'Legacy JSON configuration detected',
            details: 'Migration from legacy JSON format may be required',
          }
        }

        return {
          name: 'Configuration',
          status: 'fail',
          message: 'No configuration found',
          details: 'Run "fractary-codex configure" to create configuration',
        }
      }

      // Load config if not pre-loaded
      const config = this.config || (await readYamlConfig(configPath))

      if (!config) {
        return {
          name: 'Configuration',
          status: 'fail',
          message: 'Invalid configuration',
          details: 'Could not parse YAML configuration',
        }
      }

      // Check organization (support both root-level and codex section)
      const organization = config.organization || config.codex?.organization

      if (!organization) {
        return {
          name: 'Configuration',
          status: 'warn',
          message: 'No organization configured',
          details: 'Organization slug is required',
        }
      }

      // Check storage providers
      const providerCount = config.storage?.length || 0
      if (providerCount === 0) {
        return {
          name: 'Configuration',
          status: 'warn',
          message: 'No storage providers configured',
          details: 'At least one storage provider is recommended',
        }
      }

      return {
        name: 'Configuration',
        status: 'pass',
        message: 'Valid YAML configuration',
        details: `Organization: ${organization}, ${providerCount} storage provider(s)`,
      }
    } catch (error: any) {
      return {
        name: 'Configuration',
        status: 'fail',
        message: 'Invalid configuration',
        details: error.message,
      }
    }
  }

  /**
   * Check cache health
   */
  async checkCache(): Promise<HealthCheck> {
    try {
      if (!this.cacheManager) {
        return {
          name: 'Cache',
          status: 'warn',
          message: 'No cache manager available',
          details: 'Cache manager not initialized',
        }
      }

      const stats = await this.cacheManager.getStats()

      if (stats.entryCount === 0) {
        return {
          name: 'Cache',
          status: 'warn',
          message: 'Cache is empty',
          details: 'Fetch some documents to populate cache',
        }
      }

      const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100

      if (healthPercent < 50) {
        return {
          name: 'Cache',
          status: 'warn',
          message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
          details: `${stats.expiredCount} expired, ${stats.staleCount} stale`,
        }
      }

      return {
        name: 'Cache',
        status: 'pass',
        message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
        details: `${formatBytes(stats.totalSize)} total`,
      }
    } catch (error: any) {
      return {
        name: 'Cache',
        status: 'fail',
        message: 'Cache check failed',
        details: error.message,
      }
    }
  }

  /**
   * Check cache health from stats (for use with CodexClient)
   */
  checkCacheFromStats(stats: CacheStats): HealthCheck {
    if (stats.entryCount === 0) {
      return {
        name: 'Cache',
        status: 'warn',
        message: 'Cache is empty',
        details: 'Fetch some documents to populate cache',
      }
    }

    const healthPercent = stats.entryCount > 0 ? (stats.freshCount / stats.entryCount) * 100 : 100

    if (healthPercent < 50) {
      return {
        name: 'Cache',
        status: 'warn',
        message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
        details: `${stats.expiredCount} expired, ${stats.staleCount} stale`,
      }
    }

    return {
      name: 'Cache',
      status: 'pass',
      message: `${stats.entryCount} entries (${healthPercent.toFixed(0)}% fresh)`,
      details: `${formatBytes(stats.totalSize)} total`,
    }
  }

  /**
   * Check storage providers
   */
  async checkStorage(): Promise<HealthCheck> {
    const configPath = this.getConfigPath()

    try {
      const config = this.config || (await readYamlConfig(configPath))

      if (!config) {
        return {
          name: 'Storage',
          status: 'fail',
          message: 'Configuration not available',
          details: 'Could not read configuration',
        }
      }

      const providers = config.storage || []

      if (providers.length === 0) {
        return {
          name: 'Storage',
          status: 'warn',
          message: 'No storage providers configured',
          details: 'Configure at least one provider in .fractary/config.yaml',
        }
      }

      const providerTypes = providers.map((p) => p.type).join(', ')
      const hasGitHub = providers.some((p) => p.type === 'github')

      if (hasGitHub && !process.env.GITHUB_TOKEN) {
        return {
          name: 'Storage',
          status: 'warn',
          message: `${providers.length} provider(s): ${providerTypes}`,
          details: 'GITHUB_TOKEN not set (required for GitHub provider)',
        }
      }

      return {
        name: 'Storage',
        status: 'pass',
        message: `${providers.length} provider(s): ${providerTypes}`,
        details: 'All configured providers available',
      }
    } catch (error: any) {
      return {
        name: 'Storage',
        status: 'fail',
        message: 'Storage check failed',
        details: error.message,
      }
    }
  }

  /**
   * Check type registry
   */
  checkTypes(): HealthCheck {
    try {
      if (!this.typeRegistry) {
        return {
          name: 'Type Registry',
          status: 'warn',
          message: 'No type registry available',
          details: 'Type registry not initialized',
        }
      }

      const allTypes = this.typeRegistry.list()
      const builtinCount = allTypes.filter((t) => this.typeRegistry!.isBuiltIn(t.name)).length
      const customCount = allTypes.length - builtinCount

      return {
        name: 'Type Registry',
        status: 'pass',
        message: `${allTypes.length} types registered`,
        details: `${builtinCount} built-in, ${customCount} custom`,
      }
    } catch (error: any) {
      return {
        name: 'Type Registry',
        status: 'fail',
        message: 'Type registry check failed',
        details: error.message,
      }
    }
  }

  /**
   * Check type registry from registry instance
   */
  checkTypesFromRegistry(registry: TypeRegistry): HealthCheck {
    try {
      const allTypes = registry.list()
      const builtinCount = allTypes.filter((t) => registry.isBuiltIn(t.name)).length
      const customCount = allTypes.length - builtinCount

      return {
        name: 'Type Registry',
        status: 'pass',
        message: `${allTypes.length} types registered`,
        details: `${builtinCount} built-in, ${customCount} custom`,
      }
    } catch (error: any) {
      return {
        name: 'Type Registry',
        status: 'fail',
        message: 'Type registry check failed',
        details: error.message,
      }
    }
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<HealthResult> {
    const checks: HealthCheck[] = []

    checks.push(await this.checkConfiguration())
    checks.push(await this.checkCache())
    checks.push(await this.checkStorage())
    checks.push(this.checkTypes())

    return this.summarize(checks)
  }

  /**
   * Run specified health checks
   */
  async run(checkNames: string[]): Promise<HealthResult> {
    const checks: HealthCheck[] = []

    for (const name of checkNames) {
      switch (name.toLowerCase()) {
        case 'configuration':
        case 'config':
          checks.push(await this.checkConfiguration())
          break
        case 'cache':
          checks.push(await this.checkCache())
          break
        case 'storage':
          checks.push(await this.checkStorage())
          break
        case 'types':
        case 'typeregistry':
        case 'type-registry':
          checks.push(this.checkTypes())
          break
      }
    }

    return this.summarize(checks)
  }

  /**
   * Create summary from checks
   */
  summarize(checks: HealthCheck[]): HealthResult {
    const passed = checks.filter((c) => c.status === 'pass').length
    const warned = checks.filter((c) => c.status === 'warn').length
    const failed = checks.filter((c) => c.status === 'fail').length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (failed > 0) {
      status = 'unhealthy'
    } else if (warned > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    return {
      summary: {
        total: checks.length,
        passed,
        warned,
        failed,
        healthy: failed === 0,
        status,
      },
      checks,
    }
  }
}

/**
 * Create a HealthChecker instance
 *
 * @param options - HealthChecker options
 * @returns HealthChecker instance
 */
export function createHealthChecker(options: HealthCheckerOptions = {}): HealthChecker {
  return new HealthChecker(options)
}
