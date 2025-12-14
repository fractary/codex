import {
  CodexConfigSchema,
  type CodexConfig,
  type SyncRules,
} from '../../schemas/config.js'
import { resolveOrganization } from './organization.js'
import { getDefaultDirectories, getDefaultRules } from './defaults.js'

export interface LoadConfigOptions {
  organizationSlug?: string
  repoName?: string
  env?: Record<string, string | undefined> // Environment variables (default: process.env)
}

/**
 * Load and resolve configuration from all sources
 *
 * Based on SPEC-00005: Configuration System
 *
 * @param options - Loading options
 * @returns Fully resolved configuration
 */
export function loadConfig(options: LoadConfigOptions = {}): CodexConfig {
  // 1. Resolve organization slug
  const orgSlug = resolveOrganization({
    orgSlug: options.organizationSlug,
    repoName: options.repoName,
  })

  // 2. Build base config with defaults
  let config: Partial<CodexConfig> = {
    organizationSlug: orgSlug,
    directories: getDefaultDirectories(orgSlug),
    rules: getDefaultRules(),
  }

  // 3. Apply environment variable overrides
  const envConfig = loadConfigFromEnv(options.env || process.env)
  config = mergeConfigs(config, envConfig)

  // 4. Validate final configuration
  return CodexConfigSchema.parse(config)
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(
  env: Record<string, string | undefined>
): Partial<CodexConfig> {
  const config: Partial<CodexConfig> = {}

  // Organization
  if (env['ORGANIZATION_SLUG'] || env['CODEX_ORG_SLUG']) {
    config.organizationSlug = env['ORGANIZATION_SLUG'] || env['CODEX_ORG_SLUG']
  }

  // Directories
  if (env['CODEX_SOURCE_DIR'] || env['CODEX_TARGET_DIR']) {
    config.directories = {
      source: env['CODEX_SOURCE_DIR'],
      target: env['CODEX_TARGET_DIR'],
    }
  }

  // Rules
  const rules: Partial<SyncRules> = {}

  if (env['CODEX_PREVENT_SELF_SYNC'] !== undefined) {
    rules.preventSelfSync = env['CODEX_PREVENT_SELF_SYNC'] === 'true'
  }

  if (env['CODEX_PREVENT_CODEX_SYNC'] !== undefined) {
    rules.preventCodexSync = env['CODEX_PREVENT_CODEX_SYNC'] === 'true'
  }

  if (env['CODEX_ALLOW_PROJECT_OVERRIDES'] !== undefined) {
    rules.allowProjectOverrides =
      env['CODEX_ALLOW_PROJECT_OVERRIDES'] === 'true'
  }

  if (Object.keys(rules).length > 0) {
    config.rules = rules
  }

  return config
}

/**
 * Deep merge two configuration objects
 * Later config overrides earlier config
 */
function mergeConfigs(
  base: Partial<CodexConfig>,
  override: Partial<CodexConfig>
): Partial<CodexConfig> {
  return {
    organizationSlug: override.organizationSlug ?? base.organizationSlug,

    directories: {
      ...base.directories,
      ...override.directories,
    },

    rules: {
      ...base.rules,
      ...override.rules,

      // Arrays are replaced, not merged
      autoSyncPatterns:
        override.rules?.autoSyncPatterns ?? base.rules?.autoSyncPatterns,
      defaultInclude:
        override.rules?.defaultInclude ?? base.rules?.defaultInclude,
      defaultExclude:
        override.rules?.defaultExclude ?? base.rules?.defaultExclude,
    },
  }
}
