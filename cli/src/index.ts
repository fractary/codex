/**
 * Fractary Codex CLI - Public API
 *
 * This module exports types and utilities for programmatic use of the CLI.
 * Most users will use the CLI binary directly via `fractary-codex` command.
 */

// Export client types for programmatic use
export type { CodexClient, CodexClientOptions, ClientFetchOptions, ClientFetchResult } from './client/codex-client.js';
export { getClient, resetClient, isClientInitialized } from './client/get-client.js';

// Export configuration types
export type {
  CodexYamlConfig,
  LegacyCodexConfig,
  StorageProviderConfig,
  CacheConfig,
  TypesConfig,
  SyncConfig,
  PermissionsConfig,
  McpConfig
} from './config/config-types.js';

// Export migration utilities
export {
  migrateConfig,
  isLegacyConfig,
  readYamlConfig,
  writeYamlConfig,
  getDefaultYamlConfig
} from './config/migrate-config.js';
