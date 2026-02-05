/**
 * Unified configuration utilities
 *
 * Re-exports from SDK's ConfigManager for backward compatibility.
 * All configuration logic is now centralized in @fractary/codex.
 */

// Re-export types and functions from SDK
export {
  type UnifiedConfig,
  type CodexConfig as CodexPluginConfig,
  type FilePluginConfig,
  type FileSourceConfig as FileSource,
  type RemoteConfig,
  readUnifiedConfig,
  writeUnifiedConfig,
  mergeUnifiedConfigs,
  generateUnifiedConfig as getDefaultUnifiedConfig,
} from '@fractary/codex'

import {
  createConfigManager,
  type UnifiedConfig,
} from '@fractary/codex'

/**
 * Initialize or update unified configuration
 *
 * @deprecated Use createConfigManager().initialize() instead
 */
export async function initializeUnifiedConfig(
  configPath: string,
  organization: string,
  project: string,
  codexRepo: string,
  options?: {
    force?: boolean
  }
): Promise<{ created: boolean; merged: boolean; config: UnifiedConfig }> {
  // Extract project root from config path
  const projectRoot = configPath.replace(/[\\/].fractary[\\/]config\.yaml$/, '') || process.cwd()

  const configManager = createConfigManager(projectRoot)
  const result = await configManager.initialize({
    organization,
    project,
    codexRepo,
    force: options?.force,
    includeFilePlugin: true,
  })

  const config = await configManager.readConfig()

  return {
    created: result.configCreated,
    merged: result.configMerged,
    config: config || {},
  }
}
