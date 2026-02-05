export {
  resolveOrganization,
  extractOrgFromRepoName,
  type ResolveOrgOptions,
} from './organization.js'

export {
  getDefaultConfig,
  getDefaultDirectories,
  getDefaultRules,
  getDefaultArchiveConfig,
} from './defaults.js'

export { loadConfig, type LoadConfigOptions } from './loader.js'

export {
  CONFIG_SCHEMA_VERSION,
  SYNC_PATTERN_PRESETS,
  DEFAULT_GLOBAL_EXCLUDES,
  getSyncPreset,
  getSyncPresetNames,
  substitutePatternPlaceholders,
  generateSyncConfigFromPreset,
  type SyncPreset,
  type SyncPresetConfig,
  type GenerateSyncConfigOptions,
} from './sync-presets.js'

// ConfigManager - centralized configuration management
export {
  // ConfigManager class
  ConfigManager,
  createConfigManager,
  // Name validation
  validateNameFormat,
  validateOrganizationName,
  validateRepositoryName,
  // Organization/project detection
  detectOrganizationFromGit,
  detectProjectName,
  // Codex repo discovery
  discoverCodexRepo,
  // Directory structure
  STANDARD_DIRECTORIES,
  ensureDirectoryStructure,
  // Gitignore management
  DEFAULT_FRACTARY_GITIGNORE,
  normalizeCachePath,
  ensureCachePathIgnored,
  // MCP server installation
  installMcpServer,
  // Configuration generation
  sanitizeForS3BucketName,
  generateUnifiedConfig,
  readUnifiedConfig,
  writeUnifiedConfig,
  mergeUnifiedConfigs,
  // Types
  type NameValidationResult,
  type DiscoverCodexRepoResult,
  type McpInstallResult,
  type DirectoryStructureResult,
  type GitignoreResult,
  type RemoteConfig,
  type CodexConfig,
  type FileSourceConfig,
  type FilePluginConfig,
  type UnifiedConfig,
  type ConfigInitOptions,
  type ConfigInitResult,
} from './manager.js'
