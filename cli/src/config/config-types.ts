/**
 * Configuration types for Codex v3.0 YAML format
 *
 * Based on the SDK's Configuration Guide:
 * https://github.com/fractary/codex/blob/main/docs/guides/configuration.md
 */

/**
 * Storage provider type
 */
export type StorageProviderType = 'local' | 'github' | 'http' | 's3';

/**
 * Local filesystem storage configuration
 */
export interface LocalStorageConfig {
  type: 'local';
  basePath: string;
  followSymlinks?: boolean;
  priority?: number;
}

/**
 * GitHub storage configuration
 */
export interface GitHubStorageConfig {
  type: 'github';
  token?: string; // Or use environment variable
  apiBaseUrl?: string; // For GitHub Enterprise
  rawBaseUrl?: string;
  branch?: string;
  priority?: number;
}

/**
 * HTTP storage configuration
 */
export interface HttpStorageConfig {
  type: 'http';
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  priority?: number;
}

/**
 * S3 storage configuration (future)
 */
export interface S3StorageConfig {
  type: 's3';
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  priority?: number;
}

/**
 * Union type for all storage providers
 */
export type StorageProviderConfig =
  | LocalStorageConfig
  | GitHubStorageConfig
  | HttpStorageConfig
  | S3StorageConfig;

/**
 * Cache configuration
 */
export interface CacheConfig {
  directory?: string;
  defaultTtl?: number; // In seconds
  maxSize?: number; // In bytes
  maxMemoryEntries?: number;
  maxMemorySize?: number; // In bytes
  enablePersistence?: boolean;
}

/**
 * Custom artifact type definition
 */
export interface CustomTypeConfig {
  name: string;
  description?: string;
  patterns: string[];
  defaultTtl?: number; // In seconds
  archiveAfterDays?: number | null;
  archiveStorage?: 'local' | 'cloud' | 'drive' | null;
}

/**
 * Types configuration
 */
export interface TypesConfig {
  custom?: Record<string, Omit<CustomTypeConfig, 'name'>>;
}

/**
 * Permission level
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

/**
 * Permission rule
 */
export interface PermissionRule {
  pattern: string;
  permission: PermissionLevel;
  users?: string[];
}

/**
 * Permissions configuration
 */
export interface PermissionsConfig {
  default?: PermissionLevel;
  rules?: PermissionRule[];
}

/**
 * Directional sync configuration (v0.7.0+)
 */
export interface DirectionalSyncConfig {
  /** Patterns to include (required) */
  include: string[];
  /** Patterns to exclude (optional) */
  exclude?: string[];
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  bidirectional?: boolean;
  conflictResolution?: 'prompt' | 'local' | 'remote' | 'newest' | 'skip';
  exclude?: string[];
  rules?: SyncRule[];
  // New format (v0.7.0+) - Recommended
  to_codex?: DirectionalSyncConfig;
  from_codex?: DirectionalSyncConfig;
  // Legacy format (deprecated, backward compatible)
  default_to_codex?: string[];
  default_from_codex?: string[];
}

/**
 * Sync rule
 */
export interface SyncRule {
  pattern: string;
  direction?: 'to-codex' | 'from-codex' | 'bidirectional';
}

/**
 * MCP server configuration
 */
export interface McpConfig {
  enabled?: boolean;
  port?: number;
}

/**
 * Codex YAML configuration
 *
 * This is the format for the codex: section in .fractary/config.yaml
 */
export interface CodexYamlConfig {
  organization: string;
  cacheDir?: string;
  storage?: StorageProviderConfig[];
  types?: TypesConfig;
  permissions?: PermissionsConfig;
  sync?: SyncConfig;
  mcp?: McpConfig;
}

/**
 * Legacy JSON configuration (v2.x)
 *
 * This is the format currently used in .fractary/plugins/codex/config.json
 */
export interface LegacyCodexConfig {
  version?: string;
  organization?: string;
  organizationSlug?: string;
  cache?: {
    directory?: string;
    defaultTtl?: string | number;
    maxSize?: string | number;
    cleanupInterval?: string;
  };
  storage?: {
    providers?: Record<string, any>;
    defaultProvider?: string;
  };
  types?: {
    custom?: any[];
  };
  sync?: {
    environments?: Record<string, string>;
    defaultEnvironment?: string;
  };
  mcp?: {
    enabled?: boolean;
    port?: number;
  };
}

/**
 * Parse a duration string to seconds
 *
 * Supports formats like: "1h", "24h", "7d", "1w", "1M", "1y"
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }

  const match = duration.match(/^(\d+)([smhdwMy])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    case 'M': return value * 2592000; // 30 days
    case 'y': return value * 31536000; // 365 days
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Parse a size string to bytes
 *
 * Supports formats like: "100MB", "1GB", "50MB"
 */
export function parseSize(size: string | number): number {
  if (typeof size === 'number') {
    return size;
  }

  const match = size.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const [, valueStr, unit] = match;
  const value = parseFloat(valueStr);

  switch (unit.toUpperCase()) {
    case 'B': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    default: throw new Error(`Unknown size unit: ${unit}`);
  }
}

/**
 * Resolve environment variables in a string
 *
 * Supports ${VAR_NAME} syntax
 */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      console.warn(`Warning: Environment variable ${varName} is not set`);
      return `\${${varName}}`; // Keep original if not found
    }
    return envValue;
  });
}

/**
 * Deep resolve environment variables in an object
 */
export function resolveEnvVarsInConfig<T>(config: T): T {
  if (typeof config === 'string') {
    return resolveEnvVars(config) as any;
  }

  if (Array.isArray(config)) {
    return config.map(item => resolveEnvVarsInConfig(item)) as any;
  }

  if (config !== null && typeof config === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = resolveEnvVarsInConfig(value);
    }
    return result;
  }

  return config;
}
