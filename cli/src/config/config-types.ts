/**
 * Configuration types for Codex v3.0 YAML format
 *
 * This module re-exports types and utilities from the SDK to ensure
 * consistency between CLI and SDK. Some types are kept locally for
 * backward compatibility with existing CLI code.
 */

// Re-export utilities from SDK - these were previously duplicated here
export {
  parseDuration,
  parseSize,
  expandEnvVars as resolveEnvVars,
  expandEnvVarsInConfig as resolveEnvVarsInConfig,
} from '@fractary/codex'

// Re-export YAML config types from SDK
export type {
  CodexYamlConfig,
  YamlStorageProviderType as StorageProviderType,
  YamlLocalStorageConfig as LocalStorageConfig,
  YamlGitHubStorageConfig as GitHubStorageConfig,
  YamlHttpStorageConfig as HttpStorageConfig,
  YamlS3StorageConfig as S3StorageConfig,
  YamlStorageProviderConfig as StorageProviderConfig,
  YamlCacheConfig as CacheConfig,
  YamlTypesConfig as TypesConfig,
  YamlPermissionLevel as PermissionLevel,
  YamlPermissionRule as PermissionRule,
  YamlPermissionsConfig as PermissionsConfig,
  DirectionalSyncConfig,
  YamlSyncRule as SyncRule,
  YamlSyncConfig as SyncConfig,
  YamlMcpConfig as McpConfig,
} from '@fractary/codex'

/**
 * Custom artifact type definition
 *
 * Note: This extends the SDK type with an additional 'name' field
 * for CLI-specific use cases.
 */
export interface CustomTypeConfig {
  name: string
  description?: string
  patterns: string[]
  defaultTtl?: number
  archiveAfterDays?: number | null
  archiveStorage?: 'local' | 'cloud' | 'drive' | null
}

/**
 * Legacy JSON configuration (v2.x)
 *
 * This is the format currently used in .fractary/plugins/codex/config.json
 */
export interface LegacyCodexConfig {
  version?: string
  organization?: string
  organizationSlug?: string
  cache?: {
    directory?: string
    defaultTtl?: string | number
    maxSize?: string | number
    cleanupInterval?: string
  }
  storage?: {
    providers?: Record<string, unknown>
    defaultProvider?: string
  }
  types?: {
    custom?: unknown[]
  }
  sync?: {
    environments?: Record<string, string>
    defaultEnvironment?: string
  }
  mcp?: {
    enabled?: boolean
    port?: number
  }
}
