/**
 * YAML Configuration Utilities
 *
 * Provides functions for reading and parsing YAML configuration files,
 * with support for the unified config format.
 */

import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'
import { expandEnvVarsInConfig, type ExpandEnvOptions } from '../env/index.js'

/**
 * Storage provider type
 */
export type StorageProviderType = 'local' | 'github' | 'http' | 's3'

/**
 * Local filesystem storage configuration
 */
export interface LocalStorageConfig {
  type: 'local'
  basePath: string
  followSymlinks?: boolean
  priority?: number
}

/**
 * GitHub storage configuration
 */
export interface GitHubStorageConfig {
  type: 'github'
  token?: string
  apiBaseUrl?: string
  rawBaseUrl?: string
  branch?: string
  priority?: number
}

/**
 * HTTP storage configuration
 */
export interface HttpStorageConfig {
  type: 'http'
  baseUrl: string
  headers?: Record<string, string>
  timeout?: number
  priority?: number
}

/**
 * S3 storage configuration
 */
export interface S3StorageConfig {
  type: 's3'
  bucket: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  priority?: number
}

/**
 * Union type for all storage providers
 */
export type StorageProviderConfig =
  | LocalStorageConfig
  | GitHubStorageConfig
  | HttpStorageConfig
  | S3StorageConfig

/**
 * Cache configuration
 */
export interface CacheConfig {
  directory?: string
  cacheDir?: string
  defaultTtl?: number
  maxSize?: number
  maxMemoryEntries?: number
  maxMemorySize?: number
  enablePersistence?: boolean
}

/**
 * Custom artifact type definition
 */
export interface CustomTypeConfig {
  description?: string
  patterns?: string[]
  defaultTtl?: number
  archiveAfterDays?: number | null
  archiveStorage?: 'local' | 'cloud' | 'drive' | null
}

/**
 * Types configuration
 */
export interface TypesConfig {
  custom?: Record<string, CustomTypeConfig>
}

/**
 * Permission level
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

/**
 * Permission rule
 */
export interface PermissionRule {
  pattern: string
  permission: PermissionLevel
  users?: string[]
}

/**
 * Permissions configuration
 */
export interface PermissionsConfig {
  default?: PermissionLevel
  rules?: PermissionRule[]
}

/**
 * Directional sync configuration
 */
export interface DirectionalSyncConfig {
  include: string[]
  exclude?: string[]
}

/**
 * Sync rule
 */
export interface SyncRule {
  pattern: string
  direction?: 'to-codex' | 'from-codex' | 'bidirectional'
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  bidirectional?: boolean
  conflictResolution?: 'prompt' | 'local' | 'remote' | 'newest' | 'skip'
  exclude?: string[]
  rules?: SyncRule[]
  to_codex?: DirectionalSyncConfig
  from_codex?: DirectionalSyncConfig
  default_to_codex?: string[]
  default_from_codex?: string[]
  environments?: Record<string, string>
}

/**
 * MCP server configuration
 */
export interface McpConfig {
  enabled?: boolean
  port?: number
}

/**
 * Archive configuration
 */
export interface ArchiveConfig {
  projects?: Record<string, unknown>
}

/**
 * File plugin configuration
 */
export interface FileConfig {
  sources?: Array<{
    name: string
    path: string
    type?: string
  }>
}

/**
 * Codex YAML configuration (unified format)
 *
 * This is the format for the codex: section in .fractary/config.yaml
 */
export interface CodexYamlConfig {
  organization: string
  project?: string
  codex_repo?: string
  cacheDir?: string
  cache?: CacheConfig
  storage?: StorageProviderConfig[]
  types?: TypesConfig
  permissions?: PermissionsConfig
  sync?: SyncConfig
  mcp?: McpConfig
  archive?: ArchiveConfig
}

/**
 * Unified configuration file format
 *
 * Contains codex section and optionally other sections (file, etc.)
 */
export interface UnifiedConfig {
  codex?: CodexYamlConfig
  file?: FileConfig
  [key: string]: unknown
}

/**
 * Options for reading configuration
 */
export interface ReadConfigOptions {
  /**
   * Whether to expand environment variables (default: true)
   */
  expandEnv?: boolean

  /**
   * Environment variables to use (default: process.env)
   */
  env?: Record<string, string | undefined>

  /**
   * Whether to warn about missing env vars (default: false)
   */
  warnOnMissingEnv?: boolean
}

/**
 * Read and parse a YAML configuration file
 *
 * Supports both unified config format (with `codex:` section)
 * and legacy flat format. Automatically expands environment variables.
 *
 * @example
 * ```typescript
 * // Unified format (recommended)
 * // config.yaml:
 * // codex:
 * //   organization: myorg
 * //   storage:
 * //     - type: github
 * //       token: ${GITHUB_TOKEN}
 *
 * const config = await readCodexConfig('.fractary/config.yaml')
 * // config.organization === 'myorg'
 * // config.storage[0].token === actual GITHUB_TOKEN value
 * ```
 */
export async function readCodexConfig(
  configPath: string,
  options: ReadConfigOptions = {}
): Promise<CodexYamlConfig> {
  const content = await fs.readFile(configPath, 'utf-8')
  const rawConfig = yaml.load(content) as Record<string, unknown>

  // Handle unified config format (has `codex:` section)
  let config: CodexYamlConfig
  if (rawConfig?.codex && typeof rawConfig.codex === 'object') {
    config = rawConfig.codex as unknown as CodexYamlConfig
  } else {
    // Legacy flat format
    config = rawConfig as unknown as CodexYamlConfig
  }

  if (!config.organization) {
    throw new Error('Invalid config: organization is required')
  }

  // Expand environment variables by default
  if (options.expandEnv !== false) {
    const envOptions: ExpandEnvOptions = {
      env: options.env,
      warnOnMissing: options.warnOnMissingEnv,
    }
    config = expandEnvVarsInConfig(config, envOptions)
  }

  return config
}

/**
 * Read the full unified configuration file
 *
 * Returns the complete config including non-codex sections (file, etc.)
 *
 * @example
 * ```typescript
 * const unified = await readUnifiedConfig('.fractary/config.yaml')
 * // unified.codex - Codex configuration
 * // unified.file - File plugin configuration
 * ```
 */
export async function readUnifiedConfig(
  configPath: string,
  options: ReadConfigOptions = {}
): Promise<UnifiedConfig> {
  const content = await fs.readFile(configPath, 'utf-8')
  let config = yaml.load(content) as UnifiedConfig

  // Expand environment variables by default
  if (options.expandEnv !== false) {
    const envOptions: ExpandEnvOptions = {
      env: options.env,
      warnOnMissing: options.warnOnMissingEnv,
    }
    config = expandEnvVarsInConfig(config, envOptions)
  }

  return config
}

/**
 * Check if a config file uses the unified format
 */
export function isUnifiedConfig(config: unknown): config is UnifiedConfig {
  return (
    config !== null &&
    typeof config === 'object' &&
    'codex' in config &&
    typeof (config as Record<string, unknown>).codex === 'object'
  )
}
