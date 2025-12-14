import type { CodexConfig, SyncRules } from '../../schemas/config.js'

/**
 * Get default directory structure
 *
 * Based on SPEC-00005: Configuration System
 */
export function getDefaultDirectories(orgSlug: string) {
  return {
    source: `.${orgSlug}`,
    target: `.${orgSlug}`,
    systems: `.${orgSlug}/systems`,
  }
}

/**
 * Get default sync rules
 *
 * Based on SPEC-00004: Routing & Distribution
 */
export function getDefaultRules(): SyncRules {
  return {
    autoSyncPatterns: [],
    preventSelfSync: true,
    preventCodexSync: true,
    allowProjectOverrides: true,
    defaultInclude: [],
    defaultExclude: [],
  }
}

/**
 * Get default configuration
 *
 * @param orgSlug - Organization slug
 * @returns Default CodexConfig
 */
export function getDefaultConfig(orgSlug: string): CodexConfig {
  return {
    organizationSlug: orgSlug,
    directories: getDefaultDirectories(orgSlug),
    rules: getDefaultRules(),
  }
}
