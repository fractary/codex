/**
 * Unified configuration utilities
 *
 * Handles creation and merging of unified .fractary/config.yaml
 * that includes both file plugin and codex plugin configuration.
 *
 * Based on SPEC-20260115: Codex-File Plugin Integration
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { CONFIG_SCHEMA_VERSION } from '@fractary/codex'

/**
 * Unified configuration structure
 */
export interface UnifiedConfig {
  file?: FilePluginConfig
  codex?: CodexPluginConfig
}

/**
 * File plugin configuration
 */
export interface FilePluginConfig {
  schema_version: string
  sources: Record<string, FileSource>
}

/**
 * File source configuration
 */
export interface FileSource {
  type: 's3' | 'r2' | 'gcs' | 'local'
  bucket?: string
  prefix?: string
  region?: string
  local: {
    base_path: string
  }
  push?: {
    compress?: boolean
    keep_local?: boolean
  }
  auth?: {
    profile?: string
  }
}

/**
 * Remote repository configuration
 */
export interface RemoteConfig {
  token?: string
}

/**
 * Codex plugin configuration
 */
export interface CodexPluginConfig {
  schema_version: string
  organization: string
  project: string
  codex_repo: string
  remotes?: Record<string, RemoteConfig>
}

/**
 * Sanitize a name for use in S3 bucket naming
 *
 * S3 bucket naming rules:
 * - Must be 3-63 characters
 * - Lowercase letters, numbers, hyphens only
 * - Must start and end with letter or number
 *
 * @param name - Name to sanitize
 * @returns Sanitized name safe for S3 bucket naming
 */
function sanitizeForS3BucketName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .substring(0, 63) // Enforce max length
}

/**
 * Get default unified configuration
 *
 * @param organization - Organization name
 * @param project - Project name
 * @param codexRepo - Codex repository name (e.g., codex.fractary.com)
 * @returns Default unified configuration
 */
export function getDefaultUnifiedConfig(organization: string, project: string, codexRepo: string): UnifiedConfig {
  const sanitizedProject = sanitizeForS3BucketName(project)

  return {
    file: {
      schema_version: CONFIG_SCHEMA_VERSION,
      sources: {
        specs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'specs/',
          region: 'us-east-1',
          local: {
            base_path: '.fractary/specs',
          },
          push: {
            compress: false,
            keep_local: true,
          },
          auth: {
            profile: 'default',
          },
        },
        logs: {
          type: 's3',
          bucket: `${sanitizedProject}-files`,
          prefix: 'logs/',
          region: 'us-east-1',
          local: {
            base_path: '.fractary/logs',
          },
          push: {
            compress: true,
            keep_local: true,
          },
          auth: {
            profile: 'default',
          },
        },
      },
    },
    codex: {
      schema_version: CONFIG_SCHEMA_VERSION,
      organization,
      project,
      codex_repo: codexRepo,
      remotes: {
        // The codex repository - uses same token as git operations
        [`${organization}/${codexRepo}`]: {
          token: '${GITHUB_TOKEN}',
        },
      },
    },
  }
}

/**
 * Read unified configuration from file
 *
 * @param configPath - Path to config file
 * @returns Unified configuration or null if not found
 */
export async function readUnifiedConfig(configPath: string): Promise<UnifiedConfig | null> {
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const config = yaml.load(content) as UnifiedConfig
    return config
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Write unified configuration to file
 *
 * @param config - Unified configuration
 * @param outputPath - Path to write config
 */
export async function writeUnifiedConfig(config: UnifiedConfig, outputPath: string): Promise<void> {
  // Ensure directory exists
  const dir = path.dirname(outputPath)
  await fs.mkdir(dir, { recursive: true })

  // Convert to YAML with nice formatting
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })

  // Write to file
  await fs.writeFile(outputPath, yamlContent, 'utf-8')
}

/**
 * Merge unified configurations
 *
 * Merges a new config into an existing one, preserving existing values
 * and only adding missing sections.
 *
 * @param existing - Existing configuration
 * @param updates - New configuration values
 * @returns Merged configuration
 */
export function mergeUnifiedConfigs(existing: UnifiedConfig, updates: UnifiedConfig): UnifiedConfig {
  const merged: UnifiedConfig = {}

  // Merge file configuration
  if (updates.file || existing.file) {
    merged.file = {
      schema_version: updates.file?.schema_version || existing.file?.schema_version || CONFIG_SCHEMA_VERSION,
      sources: {
        ...(existing.file?.sources || {}),
        ...(updates.file?.sources || {}),
      },
    }
  }

  // Merge codex configuration
  if (updates.codex || existing.codex) {
    merged.codex = {
      schema_version: updates.codex?.schema_version || existing.codex?.schema_version || CONFIG_SCHEMA_VERSION,
      organization: updates.codex?.organization || existing.codex?.organization || 'default',
      project: updates.codex?.project || existing.codex?.project || 'default',
      codex_repo: updates.codex?.codex_repo || existing.codex?.codex_repo || '',
      remotes: {
        ...(existing.codex?.remotes || {}),
        ...(updates.codex?.remotes || {}),
      },
    }
  }

  return merged
}

/**
 * Initialize or update unified configuration
 *
 * Creates a new config if it doesn't exist, or merges with existing config.
 *
 * @param configPath - Path to config file
 * @param organization - Organization name
 * @param project - Project name
 * @param codexRepo - Codex repository name (e.g., codex.fractary.com)
 * @param options - Options for initialization
 * @returns Result of initialization
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
  // Check if config exists
  const existingConfig = await readUnifiedConfig(configPath)

  if (existingConfig && !options?.force) {
    // Merge with existing config
    const defaultConfig = getDefaultUnifiedConfig(organization, project, codexRepo)
    const merged = mergeUnifiedConfigs(existingConfig, defaultConfig)
    await writeUnifiedConfig(merged, configPath)

    return {
      created: false,
      merged: true,
      config: merged,
    }
  }

  // Create new config
  const config = getDefaultUnifiedConfig(organization, project, codexRepo)
  await writeUnifiedConfig(config, configPath)

  return {
    created: true,
    merged: false,
    config,
  }
}
